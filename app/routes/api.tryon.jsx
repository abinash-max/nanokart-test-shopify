import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "../db.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonWithCors(payload, status = 200) {
  return Response.json(payload, { status, headers: CORS_HEADERS });
}

const s3Region = process.env.AWS_REGION;
const s3Bucket = process.env.AWS_S3_BUCKET;

const s3Client =
  s3Region && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? new S3Client({
        region: s3Region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

function getFileExtension(filename = "", contentType = "") {
  if (filename.includes(".")) {
    return filename.slice(filename.lastIndexOf("."));
  }

  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  return map[contentType] || ".jpg";
}

async function uploadHumanImageToS3(humanImage) {
  if (!s3Client || !s3Region || !s3Bucket) {
    throw new Error(
      "Missing AWS S3 configuration. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.",
    );
  }

  const objectKey = `shopify_user/${Date.now()}-${randomUUID()}${getFileExtension(humanImage.name, humanImage.type)}`;
  const arrayBuffer = await humanImage.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: objectKey,
      Body: body,
      ContentType: humanImage.type || "application/octet-stream",
    }),
  );

  // Use a signed URL so object does not need to be publicly readable.
  const signedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: s3Bucket, Key: objectKey }),
    { expiresIn: 3600 },
  );

  return signedUrl;
}

function normalizeShop(shop) {
  return String(shop || "").trim().toLowerCase();
}

async function getMerchantNanokartConfig(request, requestShop) {
  const url = new URL(request.url);
  const shopCandidates = [
    requestShop,
    url.searchParams.get("shop"),
    request.headers.get("x-shopify-shop-domain"),
    request.headers.get("shopify-shop-domain"),
  ]
    .map(normalizeShop)
    .filter(Boolean);

  const shop = shopCandidates[0];
  if (!shop) {
    return {
      error:
        "Missing shop context. Configure App Proxy or send shop in request payload.",
      status: 400,
    };
  }

  const config = await prisma.merchantConfig.findFirst({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  if (!config?.apiKey || !config?.partnerId) {
    return {
      error:
        "Nanokart credentials are not configured for this shop. Open app and save API Key + Partner ID first.",
      status: 400,
    };
  }

  return {
    apiKey: config.apiKey,
    partnerId: config.partnerId,
    shop,
  };
}

export const loader = async () => {
  return jsonWithCors(
    {
      ok: true,
      message: "Nanokart TryOn endpoint is reachable. Use POST with formData.",
    },
    200,
  );
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const contentType = request.headers.get("content-type") || "";
  let humanImageUrl = "";
  let garmentImageUrl = "";
  let requestShop = "";
  let skuId = "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    humanImageUrl = String(body?.human_image_url ?? "").trim();
    garmentImageUrl = String(body?.garment_image_url ?? "").trim();
    requestShop = String(body?.shop ?? "").trim();
    skuId = String(body?.sku_id ?? "").trim();
  } else {
    const formData = await request.formData();
    const humanImage = formData.get("human_image");
    garmentImageUrl = String(formData.get("garment_image_url") ?? "").trim();
    requestShop = String(formData.get("shop") ?? "").trim();
    skuId = String(formData.get("sku_id") ?? "").trim();

    if (!humanImage || typeof humanImage === "string") {
      return jsonWithCors({ error: "Missing human_image upload" }, 400);
    }

    try {
      humanImageUrl = await uploadHumanImageToS3(humanImage);
    } catch (err) {
      return jsonWithCors(
        {
          error: "Failed to upload human image to S3",
          details: err instanceof Error ? err.message : String(err),
        },
        500,
      );
    }
  }

  if (!humanImageUrl) {
    return jsonWithCors({ error: "Missing human_image_url" }, 400);
  }

  if (!garmentImageUrl) {
    return jsonWithCors({ error: "Missing garment_image_url" }, 400);
  }

  const merchantConfig = await getMerchantNanokartConfig(request, requestShop);
  if (merchantConfig.error) {
    return jsonWithCors({ error: merchantConfig.error }, merchantConfig.status);
  }

  let response;
  try {
    response = await fetch("https://api.nanokart.ai/api/v1/tryon/external", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": merchantConfig.apiKey,
        "X-Partner-Id": merchantConfig.partnerId,
      },
      body: JSON.stringify({
        human_image_url: humanImageUrl,
        garment_image_url: garmentImageUrl,
        sku_id: skuId || undefined,
        customer_id: merchantConfig.shop,
      }),
    });
  } catch (err) {
    return jsonWithCors(
      {
        error: "Failed to reach Nanokart API",
        details: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }

  const rawBody = await response.text();
  let result;
  try {
    result = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return jsonWithCors(
      { error: "Nanokart API returned non-JSON response", details: rawBody },
      502,
    );
  }

  if (!response.ok) {
    const message =
      result?.error ||
      result?.message ||
      result?.detail ||
      `Nanokart API failed with status ${response.status}`;
    return jsonWithCors({ error: message, details: result }, response.status);
  }

  return jsonWithCors(result, response.status);
};

