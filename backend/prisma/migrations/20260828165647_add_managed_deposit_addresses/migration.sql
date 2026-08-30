-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AcceptedCurrency" ADD VALUE 'USDT';
ALTER TYPE "AcceptedCurrency" ADD VALUE 'USDC';
ALTER TYPE "AcceptedCurrency" ADD VALUE 'DEURO';

-- CreateTable
CREATE TABLE "managed_deposit_addresses" (
    "id" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "currency" "AcceptedCurrency" NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managed_deposit_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "managed_deposit_addresses_chain_currency_key" ON "managed_deposit_addresses"("chain", "currency");
