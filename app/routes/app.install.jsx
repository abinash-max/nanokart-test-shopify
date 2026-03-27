import { boundary } from "@shopify/shopify-app-react-router/server";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";

function extractNumericThemeId(gid = "") {
  return String(gid).split("/").pop() || "";
}

function toThemeGid(themeId = "") {
  if (String(themeId).startsWith("gid://")) return String(themeId);
  return `gid://shopify/OnlineStoreTheme/${themeId}`;
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(`
      query AppInstallThemes {
        themes(first: 20) {
          edges {
            node {
              id
              name
              role
            }
          }
        }
      }
    `);

    const data = await response.json();
    const themes = (data?.data?.themes?.edges || []).map((edge) => ({
      id: edge.node.id,
      themeId: extractNumericThemeId(edge.node.id),
      name: edge.node.name,
      role: edge.node.role,
    }));

    return {
      shop: session.shop,
      themes,
      missingThemeScope: false,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return {
      shop: session.shop,
      themes: [],
      missingThemeScope: details.includes("read_themes"),
      loaderError: details,
    };
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const themeId = String(formData.get("themeId") ?? "").trim();
  const themeName = String(formData.get("themeName") ?? "").trim();

  if (!themeId) {
    return {
      ok: false,
      message: "Missing theme id for verification.",
    };
  }

  try {
    const response = await admin.graphql(
      `
        query VerifyTryOnInstallation($id: ID!, $filenames: [String!]!) {
          theme(id: $id) {
            id
            name
            role
            files(first: 20, filenames: $filenames) {
              nodes {
                filename
                body {
                  ... on OnlineStoreThemeFileBodyText {
                    content
                  }
                }
              }
            }
          }
        }
      `,
      {
        variables: {
          id: toThemeGid(themeId),
          filenames: [
            "templates/product.json",
            "templates/product.alternate.json",
            "sections/main-product.liquid",
          ],
        },
      },
    );

    const data = await response.json();
    const files = data?.data?.theme?.files?.nodes || [];
    const markers = [
      "shopify://apps/nanokart-tryon-extension/blocks/tryon-button",
      "nanokart-tryon-extension/blocks/tryon-button",
    ];

    const found = files.some((file) => {
      const content = file?.body?.content || "";
      return markers.some((marker) => content.includes(marker));
    });

    if (found) {
      return {
        ok: true,
        message: `Try-On block detected in "${themeName || themeId}".`,
      };
    }

    return {
      ok: false,
      message:
        "Try-On block not detected yet. Open Theme Editor, add block under Apps in product template, then verify again.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        "Could not auto-verify installation. You can still test manually on a product page.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
};

export default function InstallPage() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";
  const currentShop = loaderData.shop;
  const currentThemes = loaderData.themes || [];
  const missingThemeScope = Boolean(loaderData.missingThemeScope);
  const loaderError = loaderData.loaderError;

  const pageWrapStyle = {
    display: "grid",
    gap: 14,
    maxWidth: 980,
    margin: "0 auto",
  };

  const cardStyle = {
    borderRadius: 18,
    border: "1px solid #dbeafe",
    background:
      "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
    boxShadow: "0 14px 34px rgba(30,64,175,0.08)",
    padding: 16,
  };

  const primaryBtn = {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  const secondaryBtn = {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #93c5fd",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <s-page>
      <div style={pageWrapStyle}>
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <img
              src="/api/logo"
              alt="Nanokart logo"
              style={{ width: 210, maxWidth: "100%", height: "auto" }}
            />
            <span
              style={{
                borderRadius: 999,
                background: "#dbeafe",
                color: "#1d4ed8",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Theme Setup
            </span>
          </div>

          <h2 style={{ margin: "0 0 8px 0", fontSize: 26, color: "#0f172a" }}>
            Install Try-On Button
          </h2>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.55 }}>
            Choose your theme and add the Nanokart Try-On block in the product
            template. Then come back and verify installation.
          </p>

          <div
            style={{
              marginTop: 12,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 12,
              padding: 12,
              color: "#1e3a8a",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            <strong>Tip:</strong> Keep your extension endpoint pointing to your
            current app URL while in development.
          </div>

          <ol
            style={{
              margin: "12px 0 0 18px",
              padding: 0,
              color: "#334155",
              lineHeight: 1.7,
            }}
          >
            <li>Open Theme Editor for the theme you want.</li>
            <li>Go to Product template.</li>
            <li>Add block from Apps -> Nanokart Try On.</li>
            <li>Save theme changes.</li>
            <li>Click Verify Installation here.</li>
          </ol>
        </div>

        {missingThemeScope && (
          <div
            style={{
              ...cardStyle,
              borderColor: "#fecaca",
              background:
                "linear-gradient(180deg, rgba(254,242,242,1) 0%, rgba(255,255,255,1) 100%)",
            }}
          >
            <p style={{ margin: 0, color: "#991b1b", lineHeight: 1.55 }}>
              Theme access scope is missing. Add <code>read_themes</code> to your
              app scopes and re-authorize the app in your dev store.
            </p>
            {loaderError && (
              <p style={{ margin: "8px 0 0 0", color: "#7f1d1d", fontSize: 13 }}>
                {loaderError}
              </p>
            )}
          </div>
        )}

        {actionData?.message && (
          <div
            style={{
              ...cardStyle,
              borderColor: actionData?.ok ? "#bbf7d0" : "#fde68a",
              background: actionData?.ok
                ? "linear-gradient(180deg, #f0fdf4 0%, rgba(255,255,255,1) 100%)"
                : "linear-gradient(180deg, #fffbeb 0%, rgba(255,255,255,1) 100%)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: actionData?.ok ? "#166534" : "#92400e",
                lineHeight: 1.55,
              }}
            >
              {actionData.message}
            </p>
            {actionData.details && (
              <p style={{ margin: "8px 0 0 0", color: "#57534e", fontSize: 13 }}>
                {actionData.details}
              </p>
            )}
          </div>
        )}

        <div style={cardStyle}>
          <h3
            style={{
              margin: "0 0 12px 0",
              color: "#0f172a",
              fontSize: 20,
            }}
          >
            Your Themes
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            {currentThemes.length === 0 ? (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  background: "#f8fafc",
                  color: "#475569",
                }}
              >
                No themes found for this store.
              </div>
            ) : (
              currentThemes.map((theme) => {
                const editorUrl = `https://${currentShop}/admin/themes/${theme.themeId}/editor?context=apps`;
                return (
                  <div
                    key={theme.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 12,
                      background: "#f8fafc",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ color: "#0f172a" }}>{theme.name}</strong>
                      <span
                        style={{
                          borderRadius: 999,
                          background: theme.role === "MAIN" ? "#dcfce7" : "#e2e8f0",
                          color: theme.role === "MAIN" ? "#166534" : "#334155",
                          padding: "4px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.03em",
                        }}
                      >
                        {theme.role}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a href={editorUrl} target="_blank" rel="noreferrer" style={primaryBtn}>
                        Open Theme Editor
                      </a>
                      <Form method="post">
                        <input type="hidden" name="themeId" value={theme.themeId} />
                        <input type="hidden" name="themeName" value={theme.name} />
                        <button type="submit" disabled={isSubmitting} style={secondaryBtn}>
                          {isSubmitting ? "Verifying..." : "Verify Installation"}
                        </button>
                      </Form>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

