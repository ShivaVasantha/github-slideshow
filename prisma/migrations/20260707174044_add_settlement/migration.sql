-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "franchiseeId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMode" NOT NULL DEFAULT 'BANK_TRANSFER',
    "note" TEXT,
    "settledOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_reference_key" ON "Settlement"("reference");

-- CreateIndex
CREATE INDEX "Settlement_franchiseeId_idx" ON "Settlement"("franchiseeId");

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
