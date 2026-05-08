import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const PLANS = {
  STARTER_MONTHLY: "Nanokart Starter – Monthly",
  GROWTH_MONTHLY: "Nanokart Growth – Monthly",
  PRO_MONTHLY: "Nanokart Professional – Monthly",
  STARTER_ANNUAL: "Nanokart Starter – Annual",
  GROWTH_ANNUAL: "Nanokart Growth – Annual",
  PRO_ANNUAL: "Nanokart Professional – Annual",
};

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
  billing: {
    [PLANS.STARTER_MONTHLY]: {
      lineItems: [
        {
          amount: 999,
          currencyCode: "INR",
          interval: BillingInterval.Every30Days,
          trialDays: 14,
        },
      ],
    },
    [PLANS.GROWTH_MONTHLY]: {
      lineItems: [
        {
          amount: 2999,
          currencyCode: "INR",
          interval: BillingInterval.Every30Days,
          trialDays: 14,
        },
      ],
    },
    [PLANS.PRO_MONTHLY]: {
      lineItems: [
        {
          amount: 7999,
          currencyCode: "INR",
          interval: BillingInterval.Every30Days,
          trialDays: 14,
        },
      ],
    },
    [PLANS.STARTER_ANNUAL]: {
      lineItems: [
        {
          amount: 9990,
          currencyCode: "INR",
          interval: BillingInterval.Annual,
          trialDays: 14,
        },
      ],
    },
    [PLANS.GROWTH_ANNUAL]: {
      lineItems: [
        {
          amount: 29990,
          currencyCode: "INR",
          interval: BillingInterval.Annual,
          trialDays: 14,
        },
      ],
    },
    [PLANS.PRO_ANNUAL]: {
      lineItems: [
        {
          amount: 79990,
          currencyCode: "INR",
          interval: BillingInterval.Annual,
          trialDays: 14,
        },
      ],
    },
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
