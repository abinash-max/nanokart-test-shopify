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

export const loader = async () => {
  return jsonWithCors({
    ok: true,
    message: "Nanokart cart-event endpoint is reachable. Use POST with JSON.",
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
  const shop = normalizeShop(body?.shop);
  const sessionId = String(body?.session_id ?? "").trim();
  const customerId = String(body?.customer_id ?? "").trim();
  const shopifyProductId = String(body?.shopify_product_id ?? "").trim();
  const shopifyVariantId = String(body?.shopify_variant_id ?? "").trim();
  const tryonKey = String(body?.tryon_key ?? "").trim();
  const eventSource = String(body?.event_source ?? "").trim() || "tryon_studio_modal";

  if (!shop) {
    return jsonWithCors({ error: "Missing shop." }, 400);
  }

  if (!sessionId) {
    return jsonWithCors({ error: "Missing session_id." }, 400);
  }

  if (!shopifyVariantId) {
    return jsonWithCors({ error: "Missing shopify_variant_id." }, 400);
  }

  try {
    const event = await prisma.addToCartEvent.create({
      data: {
        shop,
        sessionId,
        customerId: customerId || null,
        shopifyProductId: shopifyProductId || null,
        shopifyVariantId,
        tryonKey: tryonKey || null,
        eventSource,
      },
    });

    return jsonWithCors({ ok: true, id: event.id }, 201);
  } catch (err) {
    return jsonWithCors(
      {
        error: "Failed to store cart event.",
        details: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
};

