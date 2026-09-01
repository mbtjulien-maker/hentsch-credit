-- CreateEnum
CREATE TYPE "InvestmentBasket" AS ENUM ('RWA_STRATEGY', 'STOCKS');

-- CreateEnum
CREATE TYPE "InvestmentPositionStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'INVESTMENT_DEPOSIT';
ALTER TYPE "TransactionType" ADD VALUE 'INVESTMENT_WITHDRAWAL';
ALTER TYPE "TransactionType" ADD VALUE 'INVESTMENT_YIELD_ACCRUAL';

-- CreateTable
CREATE TABLE "investment_positions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "basket" "InvestmentBasket" NOT NULL,
    "principalAmount" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "accruedYield" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "status" "InvestmentPositionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "investment_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_basket_runs" (
    "id" TEXT NOT NULL,
    "runDate" DATE NOT NULL,
    "marketSignalPct" DECIMAL(9,6) NOT NULL,
    "dailyReturnPct" DECIMAL(9,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_basket_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_positions_userId_idx" ON "investment_positions"("userId");

-- CreateIndex
CREATE INDEX "investment_positions_status_idx" ON "investment_positions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_basket_runs_runDate_key" ON "stock_basket_runs"("runDate");

-- AddForeignKey
ALTER TABLE "investment_positions" ADD CONSTRAINT "investment_positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
