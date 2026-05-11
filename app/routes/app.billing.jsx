import { useState } from "react";
import { Form, redirect, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { PLANS, ALL_PLAN_KEYS as ALL_PLANS } from "../lib/plans";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  const billingCheck = await billing.check({
    plans: ALL_PLANS,
    isTest: true,
  });

  const activeSub = billingCheck.appSubscriptions?.[0] ?? null;

  return {
    shop: session.shop,
    hasActiveSubscription: billingCheck.hasActivePayment,
    activePlan: activeSub?.name ?? null,
  };
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const plan = formData.get("plan");

  if (intent === "subscribe") {
    if (ALL_PLANS.includes(plan)) {
      // billing.request returns a redirect Response to Shopify's hosted
      // confirmation page — we must return it so the browser follows it.
      return await billing.request({
        plan,
        isTest: true,
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app`,
      });
    }
  }

  if (intent === "cancel") {
    const billingCheck = await billing.check({
      plans: ALL_PLANS,
      isTest: true,
    });
    const activeSub = billingCheck.appSubscriptions?.[0];
    if (activeSub) {
      await billing.cancel({
        subscriptionId: activeSub.id,
        isTest: true,
        prorate: true,
      });
    }
    const url = new URL(request.url);
    return redirect(`/app/billing${url.search}`);
  }

  return null;
};

const PLAN_DATA = {
  monthly: [
    {
      id: PLANS.STARTER_MONTHLY,
      tier: "Starter",
      price: "₹999",
      period: "/mo",
      billing: "+ GST · billed monthly",
      usage: "₹500 usage/mo included",
      cta: "Start Free Trial",
      popular: false,
      costPerUse: { tryOn: "₹24", sizeRec: "₹3", moments: "₹10" },
      features: [
        "Shareable Try-On links",
        "Basic analytics dashboard",
        "Email and community support",
        "30-day logs retention",
        "Up to 50 SKUs storage in Nanokart inventory",
      ],
      parentFeatures: null,
    },
    {
      id: PLANS.GROWTH_MONTHLY,
      tier: "Growth",
      price: "₹2,999",
      period: "/mo",
      billing: "+ GST · billed monthly",
      usage: "₹1,500 usage/mo included",
      cta: "Upgrade to Growth",
      popular: true,
      costPerUse: { tryOn: "₹22", sizeRec: "₹2", moments: "₹9" },
      parentFeatures: "Everything in Starter, and:",
      features: [
        "Priority API processing",
        "Custom watermark control",
        "Shopify + WooCommerce",
        "Preloaded Try-On links",
        "Up to 3 team members",
        "90-day logs and full audit",
        "Up to 500 SKUs storage in Nanokart inventory",
      ],
    },
    {
      id: PLANS.PRO_MONTHLY,
      tier: "Professional",
      price: "₹7,999",
      period: "/mo",
      billing: "+ GST · billed monthly",
      usage: "₹3,000 usage/mo included",
      cta: "Go Professional",
      popular: false,
      costPerUse: { tryOn: "₹20", sizeRec: "₹1.5", moments: "₹8" },
      parentFeatures: "Everything in Growth, and:",
      features: [
        "Full API, no watermark",
        "Advanced analytics dashboard",
        "SmartGate: Customer Wallet",
        "180-day logs and full audit",
        "Up to 5 team members",
        "Unlimited SKUs storage in Nanokart inventory",
      ],
      boldFeature: "SmartGate: Customer Wallet",
    },
  ],
  annual: [
    {
      id: PLANS.STARTER_ANNUAL,
      tier: "Starter",
      price: "₹833",
      originalPrice: "₹999",
      period: "/mo",
      billing: "Billed annually at ₹9,990 + GST",
      usage: "₹500 usage/mo included",
      cta: "Start Free Trial",
      popular: false,
      costPerUse: { tryOn: "₹24", sizeRec: "₹3", moments: "₹10" },
      parentFeatures: null,
      features: [
        "Shareable Try-On links",
        "Basic analytics dashboard",
        "Email and community support",
        "30-day logs retention",
        "Up to 50 SKUs storage in Nanokart inventory",
      ],
    },
    {
      id: PLANS.GROWTH_ANNUAL,
      tier: "Growth",
      price: "₹2,499",
      originalPrice: "₹2,999",
      period: "/mo",
      billing: "Billed annually at ₹29,990 + GST",
      usage: "₹1,500 usage/mo included",
      cta: "Upgrade to Growth",
      popular: true,
      costPerUse: { tryOn: "₹22", sizeRec: "₹2", moments: "₹9" },
      parentFeatures: "Everything in Starter, and:",
      features: [
        "Priority API processing",
        "Custom watermark control",
        "Shopify + WooCommerce",
        "Preloaded Try-On links",
        "Up to 3 team members",
        "90-day logs and full audit",
        "Up to 500 SKUs storage in Nanokart inventory",
      ],
    },
    {
      id: PLANS.PRO_ANNUAL,
      tier: "Professional",
      price: "₹6,666",
      originalPrice: "₹7,999",
      period: "/mo",
      billing: "Billed annually at ₹79,990 + GST",
      usage: "₹3,000 usage/mo included",
      cta: "Go Professional",
      popular: false,
      costPerUse: { tryOn: "₹20", sizeRec: "₹1.5", moments: "₹8" },
      parentFeatures: "Everything in Growth, and:",
      features: [
        "Full API, no watermark",
        "Advanced analytics dashboard",
        "SmartGate: Customer Wallet",
        "180-day logs and full audit",
        "Up to 5 team members",
        "Unlimited SKUs storage in Nanokart inventory",
      ],
      boldFeature: "SmartGate: Customer Wallet",
    },
  ],
};

export default function BillingPage() {
  const { hasActiveSubscription, activePlan } = useLoaderData();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = isAnnual ? PLAN_DATA.annual : PLAN_DATA.monthly;

  const baseCard = {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#fff",
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  };

  const popularCard = {
    ...baseCard,
    background: "#0f172a",
    border: "2px solid #3b82f6",
    color: "#fff",
  };

  const lightText = { color: "#64748b", fontSize: 13 };
  const popularLightText = { color: "#94a3b8", fontSize: 13 };

  return (
    <s-page>
      <div
        style={{
          minHeight: "100vh",
          padding: "32px 16px 64px",
          background: "#f8fafc",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {/* Active subscription banner */}
          {hasActiveSubscription && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 12,
                padding: "14px 20px",
                marginBottom: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    background: "#dcfce7",
                    color: "#15803d",
                    borderRadius: 999,
                    padding: "3px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Active
                </span>
                <span style={{ fontSize: 14, color: "#166534" }}>
                  <strong>Current plan:</strong> {activePlan}
                </span>
              </div>
              <Form method="post">
                <input type="hidden" name="intent" value="cancel" />
                <button
                  type="submit"
                  style={{
                    background: "transparent",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    borderRadius: 8,
                    fontWeight: 600,
                    padding: "6px 16px",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Cancel subscription
                </button>
              </Form>
            </div>
          )}

          {/* Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              marginBottom: 36,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: isAnnual ? 400 : 600,
                color: isAnnual ? "#64748b" : "#0f172a",
              }}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              style={{
                width: 48,
                height: 26,
                borderRadius: 999,
                background: isAnnual ? "#3b82f6" : "#cbd5e1",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
                padding: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: isAnnual ? 24 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                  transition: "left 0.2s",
                  display: "block",
                }}
              />
            </button>
            <span
              style={{
                fontSize: 15,
                fontWeight: isAnnual ? 600 : 400,
                color: isAnnual ? "#0f172a" : "#64748b",
              }}
            >
              Annually
            </span>
            <span
              style={{
                background: "#dcfce7",
                color: "#15803d",
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Save 17% · 2 Months Free
            </span>
          </div>

          {/* Plan cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              alignItems: "start",
            }}
          >
            {plans.map((plan) => {
              const isPopular = plan.popular;
              const isActive = activePlan === plan.id;
              const card = isPopular ? popularCard : baseCard;
              const lt = isPopular ? popularLightText : lightText;
              const headingColor = isPopular ? "#60a5fa" : "#0f172a";
              const priceColor = isPopular ? "#fff" : "#0f172a";
              const usageColor = isPopular ? "#34d399" : "#16a34a";
              const featureColor = isPopular ? "#e2e8f0" : "#334155";

              return (
                <div key={plan.id} style={card}>
                  {/* Most Popular badge */}
                  {isPopular && (
                    <div
                      style={{
                        position: "absolute",
                        top: -16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#3b82f6",
                        color: "#fff",
                        borderRadius: 999,
                        padding: "4px 18px",
                        fontSize: 13,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Most Popular
                    </div>
                  )}

                  {/* Tier name */}
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: headingColor,
                    }}
                  >
                    {plan.tier}
                  </p>

                  {/* Price */}
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 4 }}
                  >
                    <span
                      style={{
                        fontSize: 40,
                        fontWeight: 900,
                        color: priceColor,
                        lineHeight: 1,
                      }}
                    >
                      {plan.price}
                    </span>
                    {plan.originalPrice && (
                      <span
                        style={{
                          fontSize: 16,
                          color: "#94a3b8",
                          textDecoration: "line-through",
                          marginLeft: 4,
                        }}
                      >
                        {plan.originalPrice}
                      </span>
                    )}
                    <span style={{ ...lt, marginLeft: 2 }}>{plan.period}</span>
                  </div>

                  <p style={{ ...lt, margin: "4px 0 2px" }}>{plan.billing}</p>
                  <p
                    style={{
                      margin: "0 0 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: usageColor,
                    }}
                  >
                    {plan.usage}
                  </p>

                  {/* CTA button */}
                  {!hasActiveSubscription && (
                    <Form method="post" style={{ marginBottom: 20 }}>
                      <input type="hidden" name="intent" value="subscribe" />
                      <input type="hidden" name="plan" value={plan.id} />
                      <button
                        type="submit"
                        style={{
                          width: "100%",
                          padding: "13px 0",
                          borderRadius: 10,
                          border: "none",
                          background: isPopular ? "#3b82f6" : "#0f172a",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 15,
                          cursor: "pointer",
                        }}
                      >
                        {plan.cta}
                      </button>
                    </Form>
                  )}

                  {isActive && (
                    <p
                      style={{
                        textAlign: "center",
                        color: "#15803d",
                        fontWeight: 700,
                        fontSize: 14,
                        marginBottom: 20,
                      }}
                    >
                      ✓ Current plan
                    </p>
                  )}

                  {/* Divider */}
                  <hr
                    style={{
                      border: "none",
                      borderTop: isPopular
                        ? "1px solid #334155"
                        : "1px solid #e2e8f0",
                      margin: "0 0 16px",
                    }}
                  />

                  {/* Cost per use */}
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: isPopular ? "#94a3b8" : "#94a3b8",
                      textTransform: "uppercase",
                    }}
                  >
                    Cost Per Use
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      { label: "Try-On", value: plan.costPerUse.tryOn },
                      { label: "Size Rec", value: plan.costPerUse.sizeRec },
                      { label: "Moments", value: plan.costPerUse.moments },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          background: isPopular ? "#1e293b" : "#f1f5f9",
                          borderRadius: 8,
                          padding: "8px 4px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: isPopular ? "#94a3b8" : "#64748b",
                            marginBottom: 4,
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: isPopular ? "#fff" : "#0f172a",
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  {plan.parentFeatures && (
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: isPopular ? "#e2e8f0" : "#0f172a",
                      }}
                    >
                      {plan.parentFeatures}
                    </p>
                  )}
                  <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          fontSize: 13,
                          color: featureColor,
                          lineHeight: 1.9,
                          fontWeight:
                            plan.boldFeature === f ? 700 : 400,
                        }}
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: 32,
              fontSize: 13,
              color: "#64748b",
            }}
          >
            All plans include a <strong>14-day free trial</strong>. Billing is
            processed securely through Shopify.
          </p>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
