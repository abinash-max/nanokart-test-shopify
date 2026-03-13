import prisma from "../db.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonWithCors(payload, status = 200) {
  return Response.json(payload, { status, headers: CORS_HEADERS });
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
  return jsonWithCors({
    ok: true,
    message:
      "Nanokart Size Recommendation endpoint is reachable. Use POST with JSON.",
  });
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
  if (!contentType.includes("application/json")) {
    return jsonWithCors({ error: "Request must be JSON." }, 400);
  }

  const body = await request.json();
  const imageS3Key = String(body?.image_s3_key ?? "").trim();
  const heightCm = Number(body?.height_cm);
  const productId = String(body?.product_id ?? "").trim();
  const sizeChartCm = body?.size_chart_cm;
  const requestShop = String(body?.shop ?? "").trim();
  const skuId = String(body?.sku_id ?? "").trim();

  if (!imageS3Key) {
    return jsonWithCors({ error: "Missing image_s3_key (tryon_key)." }, 400);
  }

  if (!Number.isInteger(heightCm) || heightCm < 50 || heightCm > 250) {
    return jsonWithCors(
      { error: "height_cm must be an integer between 50 and 250." },
      400,
    );
  }

  if (!productId && !sizeChartCm) {
    return jsonWithCors(
      { error: "Provide either product_id or size_chart_cm." },
      400,
    );
  }

  const merchantConfig = await getMerchantNanokartConfig(request, requestShop);
  if (merchantConfig.error) {
    return jsonWithCors({ error: merchantConfig.error }, merchantConfig.status);
  }

  const payload = {
    image_s3_key: imageS3Key,
    height_cm: heightCm,
    customer_id: merchantConfig.shop,
  };

  if (productId) payload.product_id = productId;
  if (sizeChartCm) payload.size_chart_cm = sizeChartCm;
  if (skuId) payload.sku_id = skuId;

  let response;
  try {
    response = await fetch("https://api.nanokart.ai/api/v1/size/recommend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": merchantConfig.apiKey,
        "X-Partner-Id": merchantConfig.partnerId,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return jsonWithCors(
      {
        error: "Failed to reach Nanokart Size Recommendation API",
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
      {
        error: "Nanokart Size Recommendation API returned non-JSON response",
        details: rawBody,
      },
      502,
    );
  }

  if (!response.ok) {
    const message =
      result?.error ||
      result?.message ||
      result?.detail ||
      `Nanokart Size Recommendation API failed with status ${response.status}`;
    return jsonWithCors({ error: message, details: result }, response.status);
  }

  return jsonWithCors(result, response.status);
};

