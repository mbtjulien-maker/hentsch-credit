-- CreateEnum
CREATE TYPE "AccountCurrency" AS ENUM ('USD', 'EUR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'ORIGINATION_FEE';
ALTER TYPE "TransactionType" ADD VALUE 'INTEREST_PAYMENT';

-- AlterTable
ALTER TABLE "credit_positions" ADD COLUMN     "creditIssuedInCurrency" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "currency" "AccountCurrency" NOT NULL DEFAULT 'USD',
ADD COLUMN     "custodyFeePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "exchangeRateAtLock" DECIMAL(18,8) NOT NULL DEFAULT 1,
ADD COLUMN     "interestRatePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "maturityDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "originationFeeAmount" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "originationFeePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "termMonths" INTEGER NOT NULL DEFAULT 12;

