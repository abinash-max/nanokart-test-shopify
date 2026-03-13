document.addEventListener("DOMContentLoaded", function () {

  const btn = document.querySelector(".nanokart-tryon-btn");
  const modal = document.getElementById("nanokart-tryon-modal");
  const close = document.querySelector(".nanokart-close");

  const upload = document.getElementById("nanokart-upload");
  const preview = document.getElementById("nanokart-preview");
  const generateBtn = document.querySelector(".nanokart-generate-btn");
  const momentsContainer = document.querySelector(".nanokart-moments-container");
  const momentButtons = Array.from(document.querySelectorAll(".nanokart-moment-btn"));
  const sizeContainer = document.querySelector(".nanokart-size-container");
  const sizeBtn = document.querySelector(".nanokart-size-btn");
  const heightInput = document.getElementById("nanokart-height-cm");
  const productIdInput = document.getElementById("nanokart-product-id");
  const sizeChartInput = document.getElementById("nanokart-size-chart-json");
  const sizeResult = document.querySelector(".nanokart-size-result");
  let latestTryonKey = "";

  if (!btn || !modal || !close || !upload || !preview || !generateBtn) return;

  function getProductImageUrl() {
    const fromBlock = btn.dataset.garmentImageUrl;
    if (fromBlock) return fromBlock;

    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    if (ogImage) return ogImage;

    const selectors = [
      "img.product__media",
      "img.product__media-image",
      ".product__media img",
      ".product-media img",
      ".product__media-item img",
      "[data-product-media] img",
      "[data-media-id] img",
      "main img[src*='cdn.shopify.com']",
    ];

    for (const sel of selectors) {
      const img = document.querySelector(sel);
      if (img && img.src) return img.src;
    }

    return null;
  }

  function normalizeAbsoluteUrl(url) {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    try {
      return new URL(trimmed, window.location.origin).toString();
    } catch (_err) {
      return trimmed;
    }
  }

  function getTryOnEndpoint() {
    const rawValue = (btn.dataset.nanokartEndpoint || "").trim();
    if (!rawValue) return "/api/tryon";

    if (/^https?:\/\//i.test(rawValue)) {
      return rawValue;
    }

    // Recover from accidental values like:
    // /apps/nanokart-tryon/https://<app-url>
    const embeddedUrlMatch = rawValue.match(/https?:\/\/[^\s]+/i);
    if (embeddedUrlMatch) {
      const embedded = embeddedUrlMatch[0].replace(/\/+$/, "");
      return embedded.endsWith("/api/tryon") ? embedded : `${embedded}/api/tryon`;
    }

    return rawValue;
  }

  function getMomentsEndpoint() {
    const tryOnEndpoint = getTryOnEndpoint();
    if (tryOnEndpoint.includes("/api/tryon")) {
      return tryOnEndpoint.replace("/api/tryon", "/api/moments");
    }
    return "/api/moments";
  }

  function getSizeEndpoint() {
    const tryOnEndpoint = getTryOnEndpoint();
    if (tryOnEndpoint.includes("/api/tryon")) {
      return tryOnEndpoint.replace("/api/tryon", "/api/size/recommend");
    }
    return "/api/size/recommend";
  }

  function getPersonImageUrl() {
    return normalizeAbsoluteUrl(btn.dataset.personImageUrl || "");
  }

  function getDefaultSizeProductId() {
    return (btn.dataset.sizeProductId || "").trim();
  }

  function getDefaultSizeChartCm() {
    const raw = (btn.dataset.defaultSizeChart || "").trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  function getProductSizeChartCm() {
    const raw = (btn.dataset.productSizeChart || "").trim();
    if (!raw || raw === "null" || raw === "{}") return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  function getShopDomain() {
    return (
      window.Shopify?.shop ||
      document.documentElement?.getAttribute("data-shop") ||
      window.location.hostname
    );
  }

  function getShopifyProductId() {
    const fromBlock = (btn.dataset.shopifyProductId || "").trim();
    if (fromBlock) return fromBlock;

    const analyticsId = window.ShopifyAnalytics?.meta?.product?.id;
    if (analyticsId) return String(analyticsId);

    const metaProductId = window.meta?.product?.id;
    if (metaProductId) return String(metaProductId);

    return "";
  }

  function toReadableError(errorValue, fallbackMessage) {
    if (!errorValue) return fallbackMessage;
    if (typeof errorValue === "string") return errorValue;
    if (typeof errorValue === "object") {
      if (typeof errorValue.message === "string") return errorValue.message;
      if (typeof errorValue.error === "string") return errorValue.error;
      try {
        return JSON.stringify(errorValue);
      } catch (_err) {
        return fallbackMessage;
      }
    }
    return String(errorValue);
  }

  function combineErrorAndDetails(errorValue, detailsValue, fallbackMessage) {
    const errorText = toReadableError(errorValue, fallbackMessage);
    const detailsText = toReadableError(detailsValue, "");
    if (!detailsText) return errorText;
    if (detailsText === errorText) return errorText;
    return `${errorText}\n${detailsText}`;
  }

  function setMomentButtonsDisabled(isDisabled) {
    momentButtons.forEach((button) => {
      button.disabled = isDisabled;
    });
  }

  btn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  close.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  upload.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
    };

    reader.readAsDataURL(file);
  });

  generateBtn.addEventListener("click", async () => {

    const file = upload.files[0];
    const personImageUrl = getPersonImageUrl();

    if (!file && !personImageUrl) {
      alert("Please upload a photo first or set Person image URL in block settings.");
      return;
    }

    generateBtn.innerText = "Generating Try-On...";
    generateBtn.disabled = true;

    try {
      latestTryonKey = "";
      if (momentsContainer) momentsContainer.style.display = "none";
      if (sizeContainer) sizeContainer.style.display = "none";
      if (sizeResult) sizeResult.style.display = "none";
      setMomentButtonsDisabled(true);

      const productImage = normalizeAbsoluteUrl(getProductImageUrl());
      const shopifyProductId = getShopifyProductId();

      if (!productImage) {
        alert("Unable to find product image on this page.");
        return;
      }

      let res;
      if (personImageUrl) {
        res = await fetch(getTryOnEndpoint(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            human_image_url: personImageUrl,
            garment_image_url: productImage,
            sku_id: shopifyProductId || undefined,
            shop: getShopDomain(),
          }),
        });
      } else {
        const formData = new FormData();
        formData.append("human_image", file);
        formData.append("garment_image_url", productImage);
        if (shopifyProductId) formData.append("sku_id", shopifyProductId);
        formData.append("shop", getShopDomain());

        res = await fetch(getTryOnEndpoint(), {
          method: "POST",
          body: formData
        });
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
      }

      if (!res.ok) {
        const fallback = `TryOn failed (HTTP ${res.status})`;
        const message = combineErrorAndDetails(data?.error, data?.details, fallback);
        alert(message);
        return;
      }

      if (data.image_url) {
        preview.src = data.image_url;
        preview.style.display = "block";
        latestTryonKey = String(data.tryon_key || "").trim();
        if (latestTryonKey && momentsContainer) {
          momentsContainer.style.display = "block";
          setMomentButtonsDisabled(false);
        }
        if (latestTryonKey && sizeContainer) {
          sizeContainer.style.display = "grid";
        }
      } else {
        alert("TryOn response did not include image_url.");
      }

    } catch (err) {
      alert(err?.message || "Something went wrong generating the Try On.");
    } finally {
      generateBtn.innerText = "Generate TryOn";
      generateBtn.disabled = false;
    }

  });

  momentButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!latestTryonKey) {
        alert("Please generate Try-On first.");
        return;
      }

      const momentType = button.dataset.momentType;
      const originalText = button.innerText;
      setMomentButtonsDisabled(true);
      button.innerText = "Generating...";

      try {
        const res = await fetch(getMomentsEndpoint(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tryon_key: latestTryonKey,
            moment_type: momentType,
            shop: getShopDomain(),
          }),
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_err) {
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        if (!res.ok) {
          const fallback = `Moments failed (HTTP ${res.status})`;
          alert(combineErrorAndDetails(data?.error, data?.details, fallback));
          return;
        }

        if (data.image_url) {
          preview.src = data.image_url;
          preview.style.display = "block";
        } else {
          alert("Moments response did not include image_url.");
        }
      } catch (err) {
        alert(err?.message || "Something went wrong creating the moment.");
      } finally {
        button.innerText = originalText;
        setMomentButtonsDisabled(false);
      }
    });
  });

  if (sizeBtn) {
    const defaultSizeProductId = getDefaultSizeProductId();
    const shopifyProductId = getShopifyProductId();
    const productSizeChartCm = getProductSizeChartCm();
    const defaultSizeChartCm = getDefaultSizeChartCm();
    if (productIdInput && !productIdInput.value) {
      productIdInput.value = defaultSizeProductId || shopifyProductId;
    }
    if (sizeChartInput && !sizeChartInput.value.trim()) {
      const initialSizeChart = productSizeChartCm || defaultSizeChartCm;
      if (initialSizeChart) {
        sizeChartInput.value = JSON.stringify(initialSizeChart);
      }
    }

    sizeBtn.addEventListener("click", async () => {
      if (!latestTryonKey) {
        alert("Please generate Try-On first.");
        return;
      }

      const heightCm = Number(heightInput?.value || 0);
      const productIdFromInput = (productIdInput?.value || "").trim();
      const productId =
        productIdFromInput || getDefaultSizeProductId() || getShopifyProductId();
      const sizeChartRaw = (sizeChartInput?.value || "").trim();

      if (!Number.isInteger(heightCm) || heightCm < 50 || heightCm > 250) {
        alert("Enter a valid height in cm (50-250).");
        return;
      }

      let sizeChartCm = productSizeChartCm || defaultSizeChartCm;
      if (sizeChartRaw) {
        try {
          sizeChartCm = JSON.parse(sizeChartRaw);
        } catch (_err) {
          alert("size_chart_cm JSON is invalid.");
          return;
        }
      }

      if (!productId && !sizeChartCm) {
        alert("No size data found. Add Default Size Product ID in block settings or enter size_chart_cm JSON.");
        return;
      }

      const originalText = sizeBtn.innerText;
      sizeBtn.disabled = true;
      sizeBtn.innerText = "Recommending...";
      if (sizeResult) sizeResult.style.display = "none";

      try {
        const payload = {
          image_s3_key: latestTryonKey,
          height_cm: heightCm,
          sku_id: getShopifyProductId() || undefined,
          shop: getShopDomain(),
        };
        if (productId) payload.product_id = productId;
        if (sizeChartCm) payload.size_chart_cm = sizeChartCm;

        const res = await fetch(getSizeEndpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_err) {
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        if (!res.ok) {
          const fallback = `Size recommendation failed (HTTP ${res.status})`;
          alert(combineErrorAndDetails(data?.error, data?.details, fallback));
          return;
        }

        const lines = [
          `Recommended Size: ${data.recommended_size || "N/A"}`,
          `Confidence: ${data.confidence_percent ?? "N/A"}%`,
          `Photo sufficient: ${data.photo_sufficient === false ? "No" : "Yes"}`,
          `Notes: ${data.fit_notes || "N/A"}`,
        ];
        if (data.insufficiency_message) {
          lines.push(`Message: ${data.insufficiency_message}`);
        }

        if (sizeResult) {
          sizeResult.textContent = lines.join("\n");
          sizeResult.style.display = "block";
        }
      } catch (err) {
        alert(err?.message || "Something went wrong getting size recommendation.");
      } finally {
        sizeBtn.disabled = false;
        sizeBtn.innerText = originalText;
      }
    });
  }

});
