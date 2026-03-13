import prisma from "../db.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ALLOWED_MOMENT_TYPES = new Set([
  "creative_workday",
  "escape",
  "unwind",
  "after_hours",
  "gentle_celebration",
]);

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
    message: "Nanokart Moments endpoint is reachable. Use POST with JSON.",
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
  const tryonKey = String(body?.tryon_key ?? "").trim();
  const momentType = String(body?.moment_type ?? "").trim();
  const requestShop = String(body?.shop ?? "").trim();

  if (!tryonKey) {
    return jsonWithCors({ error: "Missing tryon_key." }, 400);
  }

  if (!momentType || !ALLOWED_MOMENT_TYPES.has(momentType)) {
    return jsonWithCors(
      {
        error:
          "Invalid moment_type. Allowed: creative_workday, escape, unwind, after_hours, gentle_celebration.",
      },
      400,
    );
  }

  const merchantConfig = await getMerchantNanokartConfig(request, requestShop);
  if (merchantConfig.error) {
    return jsonWithCors({ error: merchantConfig.error }, merchantConfig.status);
  }

  let response;
  try {
    response = await fetch("https://api.nanokart.ai/api/v1/moments/external", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": merchantConfig.apiKey,
        "X-Partner-Id": merchantConfig.partnerId,
      },
      body: JSON.stringify({
        tryon_key: tryonKey,
        moment_type: momentType,
        customer_id: merchantConfig.shop,
      }),
    });
  } catch (err) {
    return jsonWithCors(
      {
        error: "Failed to reach Nanokart Moments API",
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
      { error: "Nanokart Moments API returned non-JSON response", details: rawBody },
      502,
    );
  }

  if (!response.ok) {
    const message =
      result?.error ||
      result?.message ||
      result?.detail ||
      `Nanokart Moments API failed with status ${response.status}`;
    return jsonWithCors({ error: message, details: result }, response.status);
  }

  return jsonWithCors(result, response.status);
};

