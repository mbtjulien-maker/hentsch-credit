-- CreateEnum
CREATE TYPE "FixedTermPlanId" AS ENUM ('TREASURY_3M', 'SEMICONDUCTORS_6M', 'CORE_BALANCED_12M', 'RWA_METALS_12M', 'AI_MEGACAPS_12M', 'ALPHA_MOMENTUM_12M');

-- CreateEnum
CREATE TYPE "FixedTermPositionStatus" AS ENUM ('ACTIVE', 'MATURED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'FIXED_TERM_DEPOSIT';
ALTER TYPE "TransactionType" ADD VALUE 'FIXED_TERM_YIELD_ACCRUAL';
ALTER TYPE "TransactionType" ADD VALUE 'FIXED_TERM_MATURITY_PAYOUT';

-- CreateTable
CREATE TABLE "fixed_term_positions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "FixedTermPlanId" NOT NULL,
    "principalAmount" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "accruedYield" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "status" "FixedTermPositionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "maturedAt" TIMESTAMP(3),

    CONSTRAINT "fixed_term_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_term_plan_runs" (
    "id" TEXT NOT NULL,
    "runDate" DATE NOT NULL,
    "plan" "FixedTermPlanId" NOT NULL,
    "marketSignalPct" DECIMAL(9,6) NOT NULL,
    "dailyReturnPct" DECIMAL(9,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_term_plan_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_term_positions_userId_idx" ON "fixed_term_positions"("userId");

-- CreateIndex
CREATE INDEX "fixed_term_positions_status_idx" ON "fixed_term_positions"("status");

-- CreateIndex
CREATE INDEX "fixed_term_positions_maturityDate_idx" ON "fixed_term_positions"("maturityDate");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_term_plan_runs_runDate_plan_key" ON "fixed_term_plan_runs"("runDate", "plan");

-- AddForeignKey
ALTER TABLE "fixed_term_positions" ADD CONSTRAINT "fixed_term_positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

