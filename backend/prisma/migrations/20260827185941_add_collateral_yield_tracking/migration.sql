-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'YIELD_REPAYMENT';

-- AlterTable
ALTER TABLE "credit_positions" ADD COLUMN     "collateralCurrency" "AcceptedCurrency",
ADD COLUMN     "collateralEntryPriceUsd" DECIMAL(18,8),
ADD COLUMN     "collateralTokenAmount" DECIMAL(28,8),
ADD COLUMN     "collateralYieldAppliedPriceUsd" DECIMAL(18,8);

-- AlterTable
ALTER TABLE "credit_requests" ADD COLUMN     "collateralCurrency" "AcceptedCurrency";

-- CreateIndex
CREATE INDEX "credit_positions_collateralCurrency_idx" ON "credit_positions"("collateralCurrency");
