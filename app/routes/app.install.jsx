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

  return (
    <s-page heading="Install Try-On Button">
      <s-section>
        <s-box
          padding="large"
          borderWidth="base"
          borderRadius="large"
          background="subdued"
        >
          <s-stack direction="block" gap="base">
            <s-text>
              Choose a theme and open the Theme Editor directly. In the editor,
              go to Apps and add the Nanokart Try On block to your product
              template.
            </s-text>
            <s-text>
              Tip: Keep your extension endpoint set to your app URL while in dev.
            </s-text>
            <s-unordered-list>
              <s-list-item>Open Theme Editor for the theme you want.</s-list-item>
              <s-list-item>Go to a Product template.</s-list-item>
              <s-list-item>Add block from Apps → Nanokart Try On.</s-list-item>
              <s-list-item>Save theme changes.</s-list-item>
              <s-list-item>Click Verify Installation here.</s-list-item>
            </s-unordered-list>
          </s-stack>
        </s-box>
      </s-section>

      {missingThemeScope && (
        <s-section>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="base">
              <s-text>
                Theme access scope is missing. Add <code>read_themes</code> to
                your app scopes and re-authorize the app in your dev store.
              </s-text>
              {loaderError && <s-text>{loaderError}</s-text>}
            </s-stack>
          </s-box>
        </s-section>
      )}

      {actionData?.message && (
        <s-section>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="base">
              <s-text>{actionData.message}</s-text>
              {actionData.details && <s-text>{actionData.details}</s-text>}
            </s-stack>
          </s-box>
        </s-section>
      )}

      <s-section heading="Your themes">
        <s-stack direction="block" gap="base">
          {currentThemes.length === 0 ? (
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-text>No themes found for this store.</s-text>
            </s-box>
          ) : (
            currentThemes.map((theme) => {
              const editorUrl = `https://${currentShop}/admin/themes/${theme.themeId}/editor?context=apps`;
              return (
                <s-box
                  key={theme.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-stack direction="block" gap="base">
                    <s-text>
                      {theme.name} ({theme.role})
                    </s-text>
                    <div style={{ display: "flex", gap: 8 }}>
                      <s-button href={editorUrl} target="_blank">
                        Open Theme Editor
                      </s-button>
                      <Form method="post">
                        <input type="hidden" name="themeId" value={theme.themeId} />
                        <input type="hidden" name="themeName" value={theme.name} />
                        <s-button type="submit" disabled={isSubmitting}>
                          Verify Installation
                        </s-button>
                      </Form>
                    </div>
                  </s-stack>
                </s-box>
              );
            })
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

