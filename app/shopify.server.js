import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

// Nanokart uses Shopify Managed Pricing — plans are defined in the Partner
// Dashboard, not here. We redirect users to the Shopify-hosted pricing page
// (https://admin.shopify.com/store/<shop>/charges/<APP_HANDLE>/pricing_plans)
// instead of calling billing.request(), which is forbidden for Managed
// Pricing apps.
//
// While the app is in review (unpublished), Shopify uses the client_id as the
// handle in URLs. Once the app is approved and published, you can override
// this via the SHOPIFY_APP_HANDLE env var on Render to use the public slug
// (e.g. "nanokart").
export const APP_HANDLE =
  process.env.SHOPIFY_APP_HANDLE || process.env.SHOPIFY_API_KEY || "nanokart";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
