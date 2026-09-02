-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvestmentBasket" ADD VALUE 'STOCKS_CONSERVATIVE';
ALTER TYPE "InvestmentBasket" ADD VALUE 'STOCKS_BALANCED';
ALTER TYPE "InvestmentBasket" ADD VALUE 'STOCKS_TECH_AI';
ALTER TYPE "InvestmentBasket" ADD VALUE 'STOCKS_MOMENTUM';

-- DropIndex
DROP INDEX "stock_basket_runs_runDate_key";

-- AlterTable
ALTER TABLE "stock_basket_runs" ADD COLUMN     "basket" "InvestmentBasket" NOT NULL DEFAULT 'STOCKS';

-- CreateIndex
CREATE UNIQUE INDEX "stock_basket_runs_runDate_basket_key" ON "stock_basket_runs"("runDate", "basket");

