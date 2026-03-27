-- CreateTable
CREATE TABLE "AddToCartEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "shopifyProductId" TEXT,
    "shopifyVariantId" TEXT NOT NULL,
    "tryonKey" TEXT,
    "eventSource" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AddToCartEvent_shop_createdAt_idx" ON "AddToCartEvent"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "AddToCartEvent_sessionId_createdAt_idx" ON "AddToCartEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AddToCartEvent_shopifyVariantId_createdAt_idx" ON "AddToCartEvent"("shopifyVariantId", "createdAt");
