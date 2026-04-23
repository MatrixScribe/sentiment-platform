-- CreateTable
CREATE TABLE "CorridorMarkup" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "markupPercent" DECIMAL(10,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorridorMarkup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorMarkup" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "markupPercent" DECIMAL(10,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorMarkup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMarkup" (
    "id" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "markupPercent" DECIMAL(10,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMarkup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierMarkup" (
    "id" TEXT NOT NULL,
    "minAmount" DECIMAL(10,2) NOT NULL,
    "maxAmount" DECIMAL(10,2) NOT NULL,
    "markupPercent" DECIMAL(10,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TierMarkup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFee" (
    "id" TEXT NOT NULL,
    "feeFlat" DECIMAL(10,2) NOT NULL,
    "feePercent" DECIMAL(10,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxSpread" (
    "id" TEXT NOT NULL,
    "spreadPercent" DECIMAL(10,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FxSpread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorCost" DECIMAL(10,2),
    "corridorMarkup" DECIMAL(10,5),
    "operatorMarkup" DECIMAL(10,5),
    "productMarkup" DECIMAL(10,5),
    "tierMarkup" DECIMAL(10,5),
    "totalMarkupPct" DECIMAL(10,5),
    "markupAmount" DECIMAL(10,2),
    "feeAmount" DECIMAL(10,2),
    "fxRate" DECIMAL(10,6),
    "fxSpreadAmount" DECIMAL(10,2),
    "runningBalance" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorridorMarkup_countryCode_key" ON "CorridorMarkup"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorMarkup_operatorId_key" ON "OperatorMarkup"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMarkup_productType_key" ON "ProductMarkup"("productType");
