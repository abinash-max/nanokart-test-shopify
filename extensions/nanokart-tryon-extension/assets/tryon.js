document.addEventListener("DOMContentLoaded", function () {

  const btn = document.querySelector(".nanokart-tryon-btn");
  const modal = document.getElementById("nanokart-tryon-modal");
  const close = document.querySelector(".nanokart-close");
  const brandLogo = document.getElementById("nanokart-brand-logo");

  const upload = document.getElementById("nanokart-upload");
  const cameraUpload = document.getElementById("nanokart-camera-upload");
  const stageCameraBtn = document.getElementById("nanokart-stage-camera-btn");
  const stageUploadBtn = document.getElementById("nanokart-stage-upload-btn");
  const uploadName = document.getElementById("nanokart-upload-name");
  const mainStage = document.getElementById("nanokart-main-stage");
  const stagePlaceholder = document.getElementById("nanokart-stage-placeholder");
  const stageGenerateWrap = document.getElementById("nanokart-stage-generate-wrap");
  const stageTopActions = document.getElementById("nanokart-stage-top-actions");
  const stageMomentTag = document.getElementById("nanokart-stage-moment-tag");
  const backToTryonBtn = document.getElementById("nanokart-back-to-tryon-btn");
  const stageClearBtn = document.getElementById("nanokart-stage-clear-btn");
  const stageLoader = document.getElementById("nanokart-stage-loader");
  const preview = document.getElementById("nanokart-preview");
  const historyContainer = document.querySelector(".nanokart-history-container");
  const historyStrip = document.querySelector(".nanokart-history-strip");
  const generateBtn = document.querySelector(".nanokart-generate-btn");
  const stageMomentsWrap = document.getElementById("nanokart-stage-moments-wrap");
  const momentsToggle = document.getElementById("nanokart-moments-toggle");
  const momentsMenu = document.getElementById("nanokart-moments-menu");
  const momentButtons = Array.from(document.querySelectorAll(".nanokart-stage-moment-btn"));
  const sizeContainer = document.querySelector(".nanokart-size-container");
  const productIdInput = document.getElementById("nanokart-product-id");
  const sizeChartInput = document.getElementById("nanokart-size-chart-json");
  const sizePanel = document.getElementById("nanokart-size-panel");
  const sizeToggle = document.getElementById("nk-sz-toggle");
  const sizeBody = document.getElementById("nk-sz-body");
  const sizeSubtitle = document.getElementById("nk-sz-subtitle");
  const sizePill = document.getElementById("nk-sz-pill");
  const unitButtons = Array.from(sizePanel?.querySelectorAll(".nk-sz-unit-btn") || []);
  const cmWrap = document.getElementById("nk-sz-cm-wrap");
  const ftWrap = document.getElementById("nk-sz-ft-wrap");
  const heightCmInput = document.getElementById("nk-sz-height-cm");
  const heightFtInput = document.getElementById("nk-sz-height-ft");
  const heightInInput = document.getElementById("nk-sz-height-in");
  const sizeSubmit = document.getElementById("nk-sz-submit");
  const sizeError = document.getElementById("nk-sz-error");
  const ftHint = document.getElementById("nk-sz-ft-hint");
  const sizeResultWrap = document.getElementById("nk-sz-result");
  const cartContainer = document.querySelector(".nanokart-cart-container");
  const addToCartBtn = document.querySelector(".nanokart-add-cart-btn");
  const cartResult = document.querySelector(".nanokart-cart-result");
  const fullscreenGallery = document.getElementById("nanokart-fullscreen-gallery");
  const galleryImage = document.getElementById("nanokart-gallery-image");
  const galleryTag = document.getElementById("nanokart-gallery-tag");
  const galleryCaption = document.getElementById("nanokart-gallery-caption");
  const galleryThumbs = document.getElementById("nanokart-gallery-thumbs");
  const galleryClose = document.querySelector(".nanokart-gallery-close");
  const galleryPrev = document.querySelector(".nanokart-gallery-prev");
  const galleryNext = document.querySelector(".nanokart-gallery-next");
  let latestTryonKey = "";
  let resultHistory = [];
  let activeHistoryIndex = -1;
  let fullscreenIndex = 0;
  let currentSelectedFile = null;
  let sizePanelUnit = "cm"; // "cm" | "ft"
  let sizePanelLoading = false;
  let sizePanelResult = null;
  const MOMENT_LABELS = {
    creative_workday: "Workday",
    unwind: "Unwind",
    after_hours: "After Hours",
    escape: "The Escape",
    gentle_celebration: "Celebrate",
  };

  if (!btn || !modal || !close || !upload || !preview || !generateBtn) return;
  setPreviewImage(null);
  if (brandLogo && !brandLogo.getAttribute("src")) {
    brandLogo.src = getLogoEndpoint();
  }
  moveTryOnButtonBelowBuyNow();
  initSizeRecommendationPanel();

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

  function getCartEventEndpoint() {
    const tryOnEndpoint = getTryOnEndpoint();
    if (tryOnEndpoint.includes("/api/tryon")) {
      return tryOnEndpoint.replace("/api/tryon", "/api/cart-event");
    }
    return "/api/cart-event";
  }

  function getLogoEndpoint() {
    const tryOnEndpoint = getTryOnEndpoint();
    if (tryOnEndpoint.includes("/api/tryon")) {
      return tryOnEndpoint.replace("/api/tryon", "/api/logo");
    }
    return "/api/logo";
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

  function getShopifyVariantId() {
    const selectedVariantFromForm = document.querySelector(
      'form[action*="/cart/add"] [name="id"]',
    )?.value;
    if (selectedVariantFromForm) return String(selectedVariantFromForm).trim();

    const genericVariantInput = document.querySelector('input[name="id"]')?.value;
    if (genericVariantInput) return String(genericVariantInput).trim();

    const fromBlock = (btn.dataset.shopifyVariantId || "").trim();
    if (fromBlock) return fromBlock;

    return "";
  }

  function getCustomerId() {
    return (btn.dataset.customerId || "").trim();
  }

  function getTryonSessionId() {
    const key = "nanokart:tryon-session-id";
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const created = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(key, created);
      return created;
    } catch (_err) {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }
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

  function setMomentsVisible(isVisible) {
    if (stageMomentsWrap) stageMomentsWrap.style.display = isVisible ? "block" : "none";
    if (!isVisible && momentsMenu) momentsMenu.style.display = "none";
  }

  function moveTryOnButtonBelowBuyNow() {
    const host = btn.parentElement;
    if (!host) return;

    const selectors = [
      ".shopify-payment-button",
      ".shopify-payment-button__button",
      'form[action*="/cart/add"] [name="checkout"]',
      "button[name='checkout']",
      "button[data-testid*='checkout']",
    ];

    let buyNowNode = null;
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node) {
        buyNowNode = node;
        break;
      }
    }

    if (!buyNowNode) return;

    const anchor =
      buyNowNode.closest(".shopify-payment-button") ||
      buyNowNode.closest("form") ||
      buyNowNode;

    if (!anchor || !anchor.parentNode) return;
    anchor.parentNode.insertBefore(host, anchor.nextSibling);
  }

  function setPreviewImage(url) {
    if (!preview) return;
    if (!url) {
      preview.removeAttribute("src");
      preview.style.display = "none";
      if (stagePlaceholder) stagePlaceholder.style.display = "flex";
      if (stageGenerateWrap) stageGenerateWrap.style.display = "none";
      if (stageTopActions) stageTopActions.style.display = "none";
      if (stageClearBtn) stageClearBtn.style.display = "none";
      return;
    }
    preview.src = url;
    preview.style.display = "block";
    if (stagePlaceholder) stagePlaceholder.style.display = "none";
    if (stageGenerateWrap && (currentSelectedFile || getPersonImageUrl())) {
      stageGenerateWrap.style.display = "block";
    }
    if (stageClearBtn) stageClearBtn.style.display = "inline-flex";
  }

  function clearCurrentImageSession() {
    currentSelectedFile = null;
    latestTryonKey = "";
    resultHistory = [];
    activeHistoryIndex = -1;
    fullscreenIndex = 0;
    if (historyStrip) historyStrip.innerHTML = "";
    if (historyContainer) historyContainer.style.display = "none";
    if (uploadName) uploadName.textContent = "No file selected";
    if (upload) upload.value = "";
    if (cameraUpload) cameraUpload.value = "";
    setMomentsVisible(false);
    resetSizePanelState();
    if (cartResult) cartResult.style.display = "none";
    if (cartContainer) cartContainer.style.display = "none";
    setPreviewImage(null);
  }

  function getLatestTryonIndex() {
    return resultHistory.findIndex((item) => item.kind === "tryon");
  }

  function syncStageTopActions() {
    if (!stageTopActions || !stageMomentTag || !backToTryonBtn) return;
    const activeItem = resultHistory[activeHistoryIndex];
    if (!activeItem || (activeItem.kind !== "moment" && activeItem.kind !== "tryon")) {
      stageTopActions.style.display = "none";
      stageMomentTag.classList.remove("is-moment", "is-tryon");
      return;
    }

    if (activeItem.kind === "tryon") {
      stageMomentTag.textContent = "TryOn";
      stageMomentTag.classList.add("is-tryon");
      stageMomentTag.classList.remove("is-moment");
      backToTryonBtn.style.display = "none";
      stageTopActions.style.display = "flex";
      return;
    }

    stageMomentTag.textContent = activeItem.momentLabel || activeItem.label || "Moment";
    stageMomentTag.classList.add("is-moment");
    stageMomentTag.classList.remove("is-tryon");
    const latestTryonIndex = getLatestTryonIndex();
    backToTryonBtn.style.display =
      latestTryonIndex >= 0 && latestTryonIndex !== activeHistoryIndex ? "inline-flex" : "none";
    stageTopActions.style.display = "flex";
  }

  function setStageLoading(isLoading) {
    if (!stageLoader) return;
    stageLoader.style.display = isLoading ? "flex" : "none";
  }

  function selectHumanPhoto(file) {
    if (!file) return;
    currentSelectedFile = file;
    if (uploadName) uploadName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function (e) {
      const uploadedUrl = e.target.result;
      setPreviewImage(uploadedUrl);
      addResultToHistory(uploadedUrl, "Your Photo", "customer_photo");
    };
    reader.readAsDataURL(file);
  }

  function setActiveHistory(index) {
    activeHistoryIndex = index;
    Array.from(historyStrip?.querySelectorAll(".nanokart-history-item") || []).forEach((itemEl, idx) => {
      const thumb = itemEl.querySelector(".nanokart-history-thumb");
      if (!thumb) return;
      if (idx === index) thumb.classList.add("is-active");
      else thumb.classList.remove("is-active");
    });
    syncStageTopActions();
  }

  function renderHistoryStrip() {
    if (!historyStrip) return;
    historyStrip.innerHTML = "";

    resultHistory.forEach((item, index) => {
      const itemWrap = document.createElement("button");
      itemWrap.type = "button";
      itemWrap.className = "nanokart-history-item";
      itemWrap.addEventListener("click", () => {
        setPreviewImage(item.imageUrl);
        setActiveHistory(index);
      });

      const thumb = document.createElement("img");
      thumb.className = "nanokart-history-thumb";
      thumb.src = item.imageUrl;
      thumb.alt = item.label || `result-${index + 1}`;
      itemWrap.appendChild(thumb);

      if (item.kind === "customer_photo") {
        const badge = document.createElement("span");
        badge.className = "nanokart-history-badge";
        badge.textContent = "You";
        itemWrap.appendChild(badge);
      } else if (item.kind === "tryon") {
        const badge = document.createElement("span");
        badge.className = "nanokart-history-badge is-tryon";
        badge.textContent = "TryOn";
        itemWrap.appendChild(badge);
      } else if (item.kind === "moment") {
        const badge = document.createElement("span");
        badge.className = "nanokart-history-badge is-moment";
        badge.textContent = "Moments";
        itemWrap.appendChild(badge);
      }

      historyStrip.appendChild(itemWrap);
    });

    if (historyContainer) historyContainer.style.display = resultHistory.length ? "block" : "none";
    setActiveHistory(activeHistoryIndex < 0 ? 0 : activeHistoryIndex);
  }

  function addResultToHistory(imageUrl, label, kind, meta = {}) {
    if (!historyStrip || !imageUrl) return;
    resultHistory = [{ imageUrl, label, kind, ...meta }, ...resultHistory].slice(0, 20);
    activeHistoryIndex = 0;
    renderHistoryStrip();
  }

  function renderFullscreenGallery() {
    if (!galleryThumbs || !galleryImage || !galleryCaption) return;
    const item = resultHistory[fullscreenIndex];
    if (!item) return;

    galleryImage.src = item.imageUrl;
    galleryCaption.textContent = `${item.label || "Output"} (${fullscreenIndex + 1}/${resultHistory.length})`;
    if (galleryTag) {
      galleryTag.classList.remove("is-you", "is-tryon", "is-moment");
      if (item.kind === "customer_photo") {
        galleryTag.textContent = "You";
        galleryTag.classList.add("is-you");
      } else if (item.kind === "tryon") {
        galleryTag.textContent = "TryOn";
        galleryTag.classList.add("is-tryon");
      } else if (item.kind === "moment") {
        galleryTag.textContent = item.momentLabel || item.label || "Moment";
        galleryTag.classList.add("is-moment");
      } else {
        galleryTag.textContent = item.label || "Output";
      }
    }
    if (galleryPrev) galleryPrev.style.display = resultHistory.length > 1 ? "inline-flex" : "none";
    if (galleryNext) galleryNext.style.display = resultHistory.length > 1 ? "inline-flex" : "none";

    galleryThumbs.innerHTML = "";
    resultHistory.forEach((historyItem, idx) => {
      const thumb = document.createElement("img");
      thumb.className = `nanokart-gallery-thumb${idx === fullscreenIndex ? " is-active" : ""}`;
      thumb.src = historyItem.imageUrl;
      thumb.alt = historyItem.label || `history-${idx + 1}`;
      thumb.addEventListener("click", () => {
        fullscreenIndex = idx;
        renderFullscreenGallery();
      });
      galleryThumbs.appendChild(thumb);
    });
  }

  function openFullscreenGallery(startIndex) {
    if (!fullscreenGallery || !resultHistory.length) return;
    fullscreenIndex = Math.max(0, Math.min(startIndex, resultHistory.length - 1));
    fullscreenGallery.style.display = "flex";
    renderFullscreenGallery();
  }

  function closeFullscreenGallery() {
    if (!fullscreenGallery) return;
    fullscreenGallery.style.display = "none";
  }

  function setModalOpen(isOpen) {
    if (isOpen) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      // Force reflow so transition starts from initial state.
      void modal.offsetWidth;
      modal.classList.add("is-open");
      syncSizePanelVisibility();
      return;
    }

    modal.classList.remove("is-open");
    closeFullscreenGallery();
    document.body.style.overflow = "";
    window.setTimeout(() => {
      if (!modal.classList.contains("is-open")) {
        modal.style.display = "none";
      }
    }, 240);
  }

  btn.addEventListener("click", () => {
    setModalOpen(true);
    if (sizeContainer) sizeContainer.style.display = "grid";
  });

  close.addEventListener("click", () => {
    setModalOpen(false);
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      setModalOpen(false);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && fullscreenGallery?.style.display === "flex") {
      closeFullscreenGallery();
      return;
    }
    if (e.key === "ArrowLeft" && fullscreenGallery?.style.display === "flex" && resultHistory.length > 1) {
      fullscreenIndex = (fullscreenIndex - 1 + resultHistory.length) % resultHistory.length;
      renderFullscreenGallery();
      return;
    }
    if (e.key === "ArrowRight" && fullscreenGallery?.style.display === "flex" && resultHistory.length > 1) {
      fullscreenIndex = (fullscreenIndex + 1) % resultHistory.length;
      renderFullscreenGallery();
      return;
    }
    if (e.key === "Escape" && modal.style.display === "flex") {
      setModalOpen(false);
    }
  });

  upload.addEventListener("change", function () {
    selectHumanPhoto(this.files?.[0]);
  });

  cameraUpload?.addEventListener("change", function () {
    selectHumanPhoto(this.files?.[0]);
  });

  stageUploadBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    upload.click();
  });

  stageCameraBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (cameraUpload) {
      cameraUpload.click();
      return;
    }
    upload.click();
  });

  if (mainStage) {
    mainStage.addEventListener("click", () => {
      if (momentsMenu) momentsMenu.style.display = "none";
      if (activeHistoryIndex < 0 || !resultHistory.length) return;
      openFullscreenGallery(activeHistoryIndex);
    });
  }

  if (stageClearBtn) {
    stageClearBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      clearCurrentImageSession();
    });
  }

  if (stageTopActions) {
    stageTopActions.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  if (backToTryonBtn) {
    backToTryonBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const latestTryonIndex = getLatestTryonIndex();
      if (latestTryonIndex < 0) return;
      const item = resultHistory[latestTryonIndex];
      if (!item) return;
      setPreviewImage(item.imageUrl);
      setActiveHistory(latestTryonIndex);
    });
  }

  if (galleryClose) {
    galleryClose.addEventListener("click", closeFullscreenGallery);
  }

  if (fullscreenGallery) {
    fullscreenGallery.addEventListener("click", (event) => {
      if (event.target === fullscreenGallery) closeFullscreenGallery();
    });
  }

  if (galleryPrev) {
    galleryPrev.addEventListener("click", () => {
      if (resultHistory.length < 2) return;
      fullscreenIndex = (fullscreenIndex - 1 + resultHistory.length) % resultHistory.length;
      renderFullscreenGallery();
    });
  }

  if (galleryNext) {
    galleryNext.addEventListener("click", () => {
      if (resultHistory.length < 2) return;
      fullscreenIndex = (fullscreenIndex + 1) % resultHistory.length;
      renderFullscreenGallery();
    });
  }

  if (momentsToggle) {
    momentsToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!momentsMenu) return;
      momentsMenu.style.display = momentsMenu.style.display === "grid" ? "none" : "grid";
    });
  }

  generateBtn.addEventListener("click", async (event) => {
    event.stopPropagation();

    const file = currentSelectedFile;
    const personImageUrl = getPersonImageUrl();

    if (!file && !personImageUrl) {
      alert("Please upload a photo first or set Person image URL in block settings.");
      return;
    }

    generateBtn.innerText = "Generating Try-On...";
    generateBtn.disabled = true;

    try {
      latestTryonKey = "";
      setStageLoading(true);
      setMomentsVisible(false);
      if (sizeContainer) sizeContainer.style.display = "grid";
      resetSizePanelState();
      if (cartContainer) cartContainer.style.display = "none";
      if (cartResult) cartResult.style.display = "none";
      setMomentButtonsDisabled(true);

      const productImage = normalizeAbsoluteUrl(getProductImageUrl());
      const shopifyProductId = getShopifyProductId();

      if (!productImage) {
        alert("Unable to find product image on this page.");
        return;
      }

      let res;
      if (!file && personImageUrl) {
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
        setPreviewImage(data.image_url);
        addResultToHistory(data.image_url, "Try-On Result", "tryon");
        latestTryonKey = String(data.tryon_key || "").trim();
        if (latestTryonKey) {
          setMomentsVisible(true);
          setMomentButtonsDisabled(false);
        }
        if (sizeContainer) {
          sizeContainer.style.display = "grid";
        }
        syncSizePanelVisibility();
        if (cartContainer) {
          cartContainer.style.display = "grid";
        }
      } else {
        alert("TryOn response did not include image_url.");
      }

    } catch (err) {
      alert(err?.message || "Something went wrong generating the Try On.");
    } finally {
      setStageLoading(false);
      generateBtn.innerText = "Try it on Me";
      generateBtn.disabled = false;
    }

  });

  momentButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!latestTryonKey) {
        alert("Please generate Try-On first.");
        return;
      }

      if (momentsMenu) momentsMenu.style.display = "none";

      const momentType = button.dataset.momentType;
      const originalText = button.innerText;
      setMomentButtonsDisabled(true);
      button.innerText = "Generating...";
      setStageLoading(true);

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
          setPreviewImage(data.image_url);
          addResultToHistory(data.image_url, `Moment ${momentType}`, "moment", {
            momentType,
            momentLabel: MOMENT_LABELS[momentType] || momentType,
          });
        } else {
          alert("Moments response did not include image_url.");
        }
      } catch (err) {
        alert(err?.message || "Something went wrong creating the moment.");
      } finally {
        setStageLoading(false);
        button.innerText = originalText;
        setMomentButtonsDisabled(false);
      }
    });
  });

  function initSizeRecommendationPanel() {
    if (!sizePanel || !sizeToggle || !sizeBody) return;

    const defaultSizeProductId = getDefaultSizeProductId();
    const shopifyProductId = getShopifyProductId();
    const productSizeChartCm = getProductSizeChartCm();
    const defaultSizeChartCm = getDefaultSizeChartCm();

    if (productIdInput && !productIdInput.value) {
      productIdInput.value = defaultSizeProductId || shopifyProductId;
    }
    if (sizeChartInput && !String(sizeChartInput.value || "").trim()) {
      const initialSizeChart = productSizeChartCm || defaultSizeChartCm;
      if (initialSizeChart) sizeChartInput.value = JSON.stringify(initialSizeChart);
    }

    sizeToggle.addEventListener("click", () => {
      const willExpand = sizeBody.hasAttribute("hidden");
      setSizePanelExpanded(willExpand);
    });

    unitButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const unit = (button.dataset.unit || "cm").toLowerCase();
        setSizePanelUnit(unit === "ft" ? "ft" : "cm");
      });
    });

    heightCmInput?.addEventListener("input", () => {
      clearSizePanelError();
      resetSizePanelResultOnly();
      syncSizeSubmitEnabled();
    });
    heightFtInput?.addEventListener("input", () => {
      clearSizePanelError();
      resetSizePanelResultOnly();
      syncSizeSubmitEnabled();
      syncFtHint();
    });
    heightInInput?.addEventListener("input", () => {
      clearSizePanelError();
      resetSizePanelResultOnly();
      syncSizeSubmitEnabled();
      syncFtHint();
    });

    sizeSubmit?.addEventListener("click", async () => {
      await handleGetSize();
    });

    setSizePanelExpanded(false);
    setSizePanelUnit("cm");
    syncSizeSubmitEnabled();
    syncSizePanelVisibility();
  }

  function syncSizePanelVisibility() {
    if (!sizeContainer) return;
    const canUse =
      !!currentSelectedFile ||
      !!latestTryonKey ||
      !!getPersonImageUrl();
    sizeContainer.style.display = canUse ? "grid" : "none";
  }

  function setSizePanelExpanded(expanded) {
    if (!sizeToggle || !sizeBody) return;
    if (expanded) {
      sizeToggle.classList.add("is-expanded");
      sizeToggle.setAttribute("aria-expanded", "true");
      sizeBody.removeAttribute("hidden");
    } else {
      sizeToggle.classList.remove("is-expanded");
      sizeToggle.setAttribute("aria-expanded", "false");
      sizeBody.setAttribute("hidden", "");
    }
    if (sizePill && sizePanelResult) {
      sizePill.hidden = expanded;
    }
  }

  function setSizePanelUnit(unit) {
    sizePanelUnit = unit === "ft" ? "ft" : "cm";
    unitButtons.forEach((btnEl) => {
      const isActive = (btnEl.dataset.unit || "").toLowerCase() === sizePanelUnit;
      if (isActive) btnEl.classList.add("is-active");
      else btnEl.classList.remove("is-active");
    });

    if (sizePanelUnit === "cm") {
      ftWrap?.setAttribute("hidden", "");
      cmWrap?.removeAttribute("hidden");
      ftHint?.setAttribute("hidden", "");
      heightFtInput && (heightFtInput.value = "");
      heightInInput && (heightInInput.value = "");
    } else {
      cmWrap?.setAttribute("hidden", "");
      ftWrap?.removeAttribute("hidden");
      heightCmInput && (heightCmInput.value = "");
    }

    clearSizePanelError();
    resetSizePanelResultOnly();
    syncSizeSubmitEnabled();
    syncFtHint();
    // Some themes delay input repaint; force immediate button state.
    window.setTimeout(syncSizeSubmitEnabled, 0);
  }

  function parseHeightCmFromPanel() {
    if (sizePanelUnit === "cm") {
      const raw = String(heightCmInput?.value || "").trim();
      if (!raw) return null;
      const v = Number.parseFloat(raw);
      if (!Number.isFinite(v)) return null;
      return Math.round(v);
    }
    const ftRaw = String(heightFtInput?.value || "").trim();
    const inRaw = String(heightInInput?.value || "").trim();
    if (!ftRaw) return null;
    const ft = Number.parseFloat(ftRaw);
    const inches = Number.parseFloat(inRaw) || 0;
    if (!Number.isFinite(ft)) return null;
    return Math.round((ft * 12 + (Number.isFinite(inches) ? inches : 0)) * 2.54);
  }

  function syncFtHint() {
    if (!ftHint) return;
    if (sizePanelUnit !== "ft") {
      ftHint.setAttribute("hidden", "");
      return;
    }
    const heightCm = parseHeightCmFromPanel();
    const hasAny = String(heightFtInput?.value || "").trim() || String(heightInInput?.value || "").trim();
    if (!hasAny || !heightCm) {
      ftHint.setAttribute("hidden", "");
      return;
    }
    ftHint.textContent = `≈ ${heightCm} cm`;
    ftHint.removeAttribute("hidden");
  }

  function syncSizeSubmitEnabled() {
    if (!sizeSubmit) return;
    const heightCm = parseHeightCmFromPanel();
    const isValid = !!heightCm && heightCm >= 100 && heightCm <= 250;
    sizeSubmit.disabled = !isValid || sizePanelLoading;

    cmWrap?.classList.toggle("is-invalid", sizePanelUnit === "cm" && !!String(heightCmInput?.value || "").trim() && !isValid);
    ftWrap?.querySelectorAll(".nk-sz-field").forEach((el) => el.classList.remove("is-invalid"));
    if (sizePanelUnit === "ft") {
      const hasAny = String(heightFtInput?.value || "").trim() || String(heightInInput?.value || "").trim();
      if (hasAny && !isValid) {
        ftWrap?.querySelectorAll(".nk-sz-field").forEach((el) => el.classList.add("is-invalid"));
      }
    }
  }

  function setSizePanelLoading(isLoading) {
    sizePanelLoading = !!isLoading;
    syncSizeSubmitEnabled();
    if (!sizeSubmit) return;
    const textEl = sizeSubmit.querySelector(".nk-sz-btn-text");
    if (textEl) textEl.textContent = isLoading ? "Analyzing" : "Get Size";
  }

  function clearSizePanelError() {
    if (!sizeError) return;
    sizeError.textContent = "";
    sizeError.setAttribute("hidden", "");
  }

  function showSizePanelError(message) {
    if (!sizeError) return;
    sizeError.textContent = message || "Failed to get size recommendation";
    sizeError.removeAttribute("hidden");
  }

  function resetSizePanelResultOnly() {
    sizePanelResult = null;
    if (sizeSubtitle) sizeSubtitle.textContent = "AI-powered fit recommendation";
    if (sizePill) sizePill.hidden = true;
    if (sizeResultWrap) {
      sizeResultWrap.innerHTML = "";
      sizeResultWrap.setAttribute("hidden", "");
    }
  }

  function resetSizePanelState() {
    clearSizePanelError();
    resetSizePanelResultOnly();
    if (heightCmInput) heightCmInput.value = "";
    if (heightFtInput) heightFtInput.value = "";
    if (heightInInput) heightInInput.value = "";
    setSizePanelUnit("cm");
    setSizePanelExpanded(false);
    syncFtHint();
    syncSizeSubmitEnabled();
  }

  function getZoneColor(pct) {
    if (pct < 45) return "#f97316";
    if (pct < 70) return "#eab308";
    return "#22c55e";
  }

  function buildCombinedNotes(result) {
    if (!result) return null;
    if (result.photoSufficient) return result.fitNotes || null;
    const parts = [];
    if (result.insufficiencyMessage) parts.push(result.insufficiencyMessage);
    if (result.fitNotes) parts.push(result.fitNotes);
    return parts.length ? parts.join(" ") : null;
  }

  function renderSizeResult(result) {
    if (!sizeResultWrap) return;
    const combinedNotes = buildCombinedNotes(result);
    const conf = result.confidencePercent ?? 0;
    const displayConfidence = !result.photoSufficient && conf === 0 ? "<10" : String(conf);
    const effectiveColor = !result.photoSufficient && conf === 0 ? 5 : conf;
    const zoneColor = getZoneColor(effectiveColor);

    const sizeText = String(result.recommendedSize || "N/A");
    const sizeFont = sizeText.length > 3 ? 20 : sizeText.length > 2 ? 24 : 30;

    // Ring math
    const r = 44;
    const c = 2 * Math.PI * r;
    const filled = (effectiveColor / 100) * c;
    const dashOffset = c - filled;

    sizeResultWrap.innerHTML = `
      <div class="nk-sz-result-card" data-testid="size-recommendation-result">
        <div class="nk-sz-hero">
          ${!result.photoSufficient ? `
            <div class="nk-sz-warning">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Low confidence due to photo quality</span>
            </div>
          ` : ""}

          <div class="nk-sz-caption">Recommended Size</div>

          <div class="nk-sz-badge-wrap">
            <svg class="nk-sz-badge-ring" width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="5"></circle>
              <circle cx="50" cy="50" r="${r}" fill="none"
                stroke="${zoneColor}" stroke-width="5" stroke-linecap="round"
                stroke-dasharray="${c} 9999" stroke-dashoffset="${dashOffset}"
                style="animation: nkSzRingFill 1.1s cubic-bezier(0.22,1,0.36,1) forwards; filter: drop-shadow(0 0 5px ${zoneColor}90);"
              ></circle>
            </svg>
            <div class="nk-sz-badge" data-testid="recommended-size-badge">
              <span style="font-size:${sizeFont}px">${escapeHtml(sizeText)}</span>
            </div>
          </div>

          <div class="nk-sz-confidence">
            <div class="nk-sz-confidence-val" style="color:${zoneColor}; text-shadow: 0 0 20px ${zoneColor}60;">${escapeHtml(displayConfidence)}%</div>
            <div class="nk-sz-confidence-label">match confidence</div>
          </div>
        </div>

        ${combinedNotes ? `
          <div class="nk-sz-notes">
            <div class="nk-sz-notes-row">
              <div class="nk-sz-notes-icon ${!result.photoSufficient ? "is-low" : ""}" aria-hidden="true">
                ${result.photoSufficient
                  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                  : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
                }
              </div>
              <p class="nk-sz-notes-text ${!result.photoSufficient ? "is-low" : ""}">${escapeHtml(combinedNotes)}</p>
            </div>
          </div>
        ` : ""}

        <div class="nk-sz-refine">
          <button type="button" id="nk-sz-refine" data-testid="size-recommend-refine-btn">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 .49-5.18"></path>
            </svg>
            Try a different height
          </button>
        </div>
      </div>
    `;

    sizeResultWrap.removeAttribute("hidden");
    const refineBtn = document.getElementById("nk-sz-refine");
    refineBtn?.addEventListener("click", () => {
      clearSizePanelError();
      resetSizePanelResultOnly();
      setSizePanelExpanded(true);
      if (heightCmInput) heightCmInput.focus();
    });
  }

  async function handleGetSize() {
    if (sizePanelLoading) return;

    const heightCm = parseHeightCmFromPanel();
    const isValid = !!heightCm && heightCm >= 100 && heightCm <= 250;
    if (!isValid) return;

    const productIdFromInput = (productIdInput?.value || "").trim();
    const productId = productIdFromInput || getDefaultSizeProductId() || getShopifyProductId();
    const sizeChartRaw = (sizeChartInput?.value || "").trim();

    let sizeChartCm = getProductSizeChartCm() || getDefaultSizeChartCm();
    if (sizeChartRaw) {
      try {
        sizeChartCm = JSON.parse(sizeChartRaw);
      } catch (_err) {
        showSizePanelError("size_chart_cm JSON is invalid.");
        return;
      }
    }

    if (!productId && !sizeChartCm) {
      showSizePanelError("No size data found. Add Default Size Product ID or size_chart_cm.");
      return;
    }

    const file = currentSelectedFile;
    if (!file && !latestTryonKey) {
      showSizePanelError("Upload a photo first (or generate Try-On to reuse latest tryon image).");
      return;
    }

    clearSizePanelError();
    setSizePanelLoading(true);

    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append("human_image", file);
        formData.append("height_cm", String(heightCm));
        formData.append("shop", getShopDomain());
        const skuId = getShopifyProductId();
        if (skuId) formData.append("sku_id", skuId);
        if (productId) formData.append("product_id", productId);
        if (sizeChartCm) formData.append("size_chart_cm", JSON.stringify(sizeChartCm));

        res = await fetch(getSizeEndpoint(), { method: "POST", body: formData });
      } else {
        const payload = {
          image_s3_key: latestTryonKey,
          height_cm: heightCm,
          sku_id: getShopifyProductId() || undefined,
          shop: getShopDomain(),
        };
        if (productId) payload.product_id = productId;
        if (sizeChartCm) payload.size_chart_cm = sizeChartCm;

        res = await fetch(getSizeEndpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_err) {
        throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
      }

      if (!res.ok) {
        const fallback = `Size recommendation failed (HTTP ${res.status})`;
        throw new Error(combineErrorAndDetails(data?.error, data?.details, fallback));
      }

      sizePanelResult = {
        recommendedSize: data.recommended_size,
        confidencePercent: data.confidence_percent,
        fitNotes: data.fit_notes,
        photoSufficient: data.photo_sufficient !== false,
        insufficiencyMessage: data.insufficiency_message,
      };

      // Header summary
      if (sizeSubtitle) {
        if (sizePanelResult) {
          const low = !sizePanelResult.photoSufficient;
          sizeSubtitle.innerHTML = `Recommended: <strong style="color:${low ? "#ef4444" : "#2563eb"}">${escapeHtml(String(sizePanelResult.recommendedSize || "N/A"))}</strong>${low ? `<span style="color:#ef4444"> (low confidence)</span>` : ""}`;
        } else {
          sizeSubtitle.textContent = "AI-powered fit recommendation";
        }
      }
      if (sizePill) {
        const pillText = String(sizePanelResult.recommendedSize || "");
        if (pillText) {
          sizePill.textContent = pillText;
          sizePill.hidden = sizeBody && !sizeBody.hasAttribute("hidden");
          if (!sizePanelResult.photoSufficient) sizePill.classList.add("is-low");
          else sizePill.classList.remove("is-low");
        } else {
          sizePill.hidden = true;
        }
      }

      renderSizeResult(sizePanelResult);
      setSizePanelExpanded(true);
    } catch (err) {
      showSizePanelError(err?.message || "Failed to get size recommendation");
    } finally {
      setSizePanelLoading(false);
    }
  }

  function escapeHtml(value) {
    const s = String(value ?? "");
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", async () => {
      const variantId = getShopifyVariantId();
      if (!variantId) {
        alert("Unable to detect selected variant. Please select a variant first.");
        return;
      }

      const originalText = addToCartBtn.innerText;
      addToCartBtn.disabled = true;
      addToCartBtn.innerText = "Adding...";
      if (cartResult) cartResult.style.display = "none";

      try {
        const cartRes = await fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            items: [{ id: Number(variantId), quantity: 1 }],
          }),
        });

        if (!cartRes.ok) {
          const cartText = await cartRes.text();
          let cartData = {};
          try {
            cartData = JSON.parse(cartText);
          } catch (_err) {
            // ignore parse errors and use fallback.
          }
          const fallback = `Add to cart failed (HTTP ${cartRes.status})`;
          alert(combineErrorAndDetails(cartData?.description || cartData?.error, cartData, fallback));
          return;
        }

        if (cartResult) {
          cartResult.textContent = "Added to cart successfully.";
          cartResult.style.display = "block";
        }

        try {
          await fetch(getCartEventEndpoint(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shop: getShopDomain(),
              customer_id: getCustomerId() || null,
              session_id: getTryonSessionId(),
              shopify_product_id: getShopifyProductId(),
              shopify_variant_id: variantId,
              tryon_key: latestTryonKey || null,
              event_source: "tryon_studio_modal",
            }),
          });
        } catch (_err) {
          // Do not block UX if tracking fails.
        }
      } catch (err) {
        alert(err?.message || "Something went wrong while adding to cart.");
      } finally {
        addToCartBtn.disabled = false;
        addToCartBtn.innerText = originalText;
      }
    });
  }

});
