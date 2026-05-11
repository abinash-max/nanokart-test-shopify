import { useEffect, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { Link, redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { ALL_PLAN_KEYS } from "../lib/plans";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session?.shop;

  const { hasActivePayment } = await billing.check({
    plans: ALL_PLAN_KEYS,
    isTest: true,
  });

  if (!hasActivePayment) {
    const url = new URL(request.url);
    throw redirect(`/app/billing${url.search}`);
  }

  const existingConfig = shop
    ? await prisma.merchantConfig.findFirst({
        where: { shop },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return {
    hasSavedConfig: Boolean(existingConfig),
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;

  const formData = await request.formData();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const partnerId = String(formData.get("partnerId") ?? "").trim();

  const errors = {};
  if (!apiKey) errors.apiKey = "API Key is required";
  if (!partnerId) errors.partnerId = "Partner ID is required";

  if (!shop) {
    return {
      ok: false,
      errors: { form: "Unable to determine the current shop." },
      values: { apiKey, partnerId },
    };
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values: { apiKey, partnerId } };
  }

  await prisma.merchantConfig.create({
    data: {
      shop,
      apiKey,
      partnerId,
    },
  });

  return { ok: true };
};

export default function Index() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSaving = navigation.state !== "idle";

  const [apiKey, setApiKey] = useState(actionData?.values?.apiKey ?? "");
  const [partnerId, setPartnerId] = useState(
    actionData?.values?.partnerId ?? "",
  );
  const [hasStarted, setHasStarted] = useState(false);
  const [showInstallCta, setShowInstallCta] = useState(false);
  const [animateInstallCta, setAnimateInstallCta] = useState(false);

  const errors = actionData?.errors ?? {};
  const showSuccess = actionData?.ok === true;

  useEffect(() => {
    try {
      setHasStarted(localStorage.getItem("nanokart:onboarding") === "config");
    } catch {
      setHasStarted(false);
    }
  }, []);

  useEffect(() => {
    if (!showSuccess) return;
    setShowInstallCta(true);
    setAnimateInstallCta(true);
    const timer = window.setTimeout(() => {
      setAnimateInstallCta(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [showSuccess]);

  const onGetStarted = () => {
    try {
      localStorage.setItem("nanokart:onboarding", "config");
    } catch {
      // ignore localStorage failures (private mode, blocked storage, etc.)
    }
    setHasStarted(true);
    window.open("https://nanokart.ai/partners/login", "_blank");
  };

  const cardStyle = {
    borderRadius: 20,
    border: "1px solid #dbeafe",
    background:
      "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
    boxShadow: "0 16px 40px rgba(30, 64, 175, 0.08)",
    padding: 24,
  };

  const primaryButtonStyle = {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontWeight: 700,
    padding: "10px 18px",
    cursor: "pointer",
  };

  return (
    <s-page>
      <div
        style={{
          minHeight: "78vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 12px",
          background:
            "radial-gradient(circle at top right, rgba(59,130,246,0.16), rgba(255,255,255,0) 40%), radial-gradient(circle at bottom left, rgba(29,78,216,0.1), rgba(255,255,255,0) 42%)",
        }}
      >
        {!hasStarted ? (
          <div style={{ width: "100%", maxWidth: 620 }}>
            <s-section>
              <div style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <img
                    src="/api/logo"
                    alt="Nanokart logo"
                    style={{ maxWidth: 230, width: "100%", height: "auto" }}
                  />
                  <span
                    style={{
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Shopify Partner App
                  </span>
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  <h2
                    style={{
                      margin: 0,
                      color: "#0f172a",
                      fontSize: 28,
                      lineHeight: 1.2,
                    }}
                  >
                    Welcome to Nanokart.ai
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: "#475569",
                      fontSize: 15,
                      lineHeight: 1.55,
                    }}
                  >
                    Enable AI-powered TryOn, Moments, and Smart Size
                    Recommendation for your Shopify store with a few quick
                    steps.
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button onClick={onGetStarted} style={primaryButtonStyle}>
                    Get Started
                  </button>
                  <span style={{ color: "#64748b", fontSize: 13 }}>
                    Open partner portal in a new tab
                  </span>
                </div>
              </div>
            </s-section>
          </div>
        ) : (
          <div
            style={{ width: "100%", maxWidth: 620, display: "grid", gap: 14 }}
          >
            <style>{`
              @keyframes nanokartInstallReveal {
                0% {
                  opacity: 0;
                  transform: translateY(14px) scale(0.98);
                }
                60% {
                  opacity: 1;
                  transform: translateY(-2px) scale(1.01);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}</style>
            {showSuccess && (
              <div
                style={{
                  ...cardStyle,
                  padding: 14,
                  borderColor: "#bbf7d0",
                  background:
                    "linear-gradient(180deg, #f0fdf4 0%, rgba(255,255,255,1) 100%)",
                }}
              >
                <s-text>Configuration saved successfully.</s-text>
              </div>
            )}

            {errors.form && (
              <div
                style={{
                  ...cardStyle,
                  padding: 14,
                  borderColor: "#fecaca",
                  background:
                    "linear-gradient(180deg, #fef2f2 0%, rgba(255,255,255,1) 100%)",
                }}
              >
                <s-text>{errors.form}</s-text>
              </div>
            )}

            <Form method="post">
              <s-section heading="Partner Configuration">
                <div style={cardStyle}>
                  <img
                    src="/api/logo"
                    alt="Nanokart logo"
                    style={{ width: 180, height: "auto", marginBottom: 14 }}
                  />
                  <s-stack direction="block" gap="base">
                    <s-text>
                      Enter your Nanokart credentials to connect your Shopify
                      store.
                    </s-text>

                    <s-text-field
                      name="apiKey"
                      label="API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.currentTarget.value)}
                      autocomplete="off"
                      error={errors.apiKey}
                    ></s-text-field>

                    <s-text-field
                      name="partnerId"
                      label="Partner ID"
                      value={partnerId}
                      onChange={(e) => setPartnerId(e.currentTarget.value)}
                      autocomplete="off"
                      error={errors.partnerId}
                    ></s-text-field>

                    <div>
                      <button
                        type="submit"
                        disabled={isSaving}
                        style={{
                          ...primaryButtonStyle,
                          opacity: isSaving ? 0.7 : 1,
                          cursor: isSaving ? "not-allowed" : "pointer",
                        }}
                      >
                        {isSaving ? "Saving..." : "Save Configuration"}
                      </button>
                    </div>
                  </s-stack>
                </div>
              </s-section>
            </Form>

            {showInstallCta && (
              <div
                style={{
                  ...cardStyle,
                  padding: 14,
                  animation: animateInstallCta
                    ? "nanokartInstallReveal 0.55s cubic-bezier(0.2, 0.9, 0.2, 1)"
                    : "none",
                }}
              >
                <s-stack direction="block" gap="base">
                  <s-text>
                    Step 3: Install the Try-On button in your store theme.
                  </s-text>
                  <div>
                    <Link
                      to="/app/install"
                      style={{
                        ...primaryButtonStyle,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                      }}
                    >
                      Install Try-On Button
                    </Link>
                  </div>
                </s-stack>
              </div>
            )}
          </div>
        )}
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
