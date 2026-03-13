import { useEffect, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;

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

  const errors = actionData?.errors ?? {};
  const showSuccess = actionData?.ok === true;
  const hasSavedConfig = Boolean(loaderData?.hasSavedConfig) || showSuccess;

  useEffect(() => {
    try {
      setHasStarted(localStorage.getItem("nanokart:onboarding") === "config");
    } catch {
      setHasStarted(false);
    }
  }, []);

  const onGetStarted = () => {
    try {
      localStorage.setItem("nanokart:onboarding", "config");
    } catch {
      // ignore localStorage failures (private mode, blocked storage, etc.)
    }
    setHasStarted(true);
    window.open("https://nanokart.ai/partners/login", "_blank");
  };

  return (
    <s-page>
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!hasStarted ? (
          <div style={{ width: "100%", maxWidth: 560 }}>
            <s-section>
              <s-box
                padding="large"
                borderWidth="base"
                borderRadius="large"
                background="subdued"
              >
                <s-stack direction="block" gap="base">
                  <s-text>Welcome to Nanokart.ai</s-text>
                  <s-text>
                    Enable AI powered virtual try-on for your Shopify store in
                    minutes.
                  </s-text>
                  <div>
                    <s-button onClick={onGetStarted}>Get Started</s-button>
                  </div>
                </s-stack>
              </s-box>
            </s-section>
          </div>
        ) : (
          <div
            style={{ width: "100%", maxWidth: 560, display: "grid", gap: 12 }}
          >
            {showSuccess && (
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-text>Configuration saved successfully.</s-text>
              </s-box>
            )}

            {hasSavedConfig && (
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-stack direction="block" gap="base">
                  <s-text>
                    Step 3: Install the Try-On button in your store theme.
                  </s-text>
                  <div>
                    <s-button href="/app/install">Install Try-On Button</s-button>
                  </div>
                </s-stack>
              </s-box>
            )}

            {errors.form && (
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-text>{errors.form}</s-text>
              </s-box>
            )}

            <Form method="post">
              <s-section heading="Merchant configuration">
                <s-box
                  padding="large"
                  borderWidth="base"
                  borderRadius="large"
                  background="subdued"
                >
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
                      <s-button type="submit" disabled={isSaving}>
                        Save Configuration
                      </s-button>
                    </div>
                  </s-stack>
                </s-box>
              </s-section>
            </Form>
          </div>
        )}
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
