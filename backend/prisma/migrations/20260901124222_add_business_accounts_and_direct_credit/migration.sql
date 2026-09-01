-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PARTICULIER', 'BUSINESS');

-- CreateEnum
CREATE TYPE "DirectCreditDecision" AS ENUM ('ELIGIBLE', 'INELIGIBLE');

-- AlterTable
ALTER TABLE "account_opening_requests" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'PARTICULIER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'PARTICULIER';

-- CreateTable
CREATE TABLE "direct_credit_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "companySeniorityMonths" INTEGER NOT NULL,
    "projectDescription" TEXT NOT NULL,
    "requestedAmount" DECIMAL(18,6) NOT NULL,
    "currency" "AccountCurrency" NOT NULL DEFAULT 'USD',
    "declaredMonthlyRevenue" DECIMAL(18,6) NOT NULL,
    "declaredMonthlyExpenses" DECIMAL(18,6) NOT NULL,
    "guaranteeOffered" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "decision" "DirectCreditDecision" NOT NULL,
    "eligibilityBreakdown" JSONB NOT NULL,
    "estimatedRatePct" DECIMAL(6,3) NOT NULL,
    "estimatedMonthlyPayment" DECIMAL(18,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_credit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "direct_credit_requests_userId_idx" ON "direct_credit_requests"("userId");

-- CreateIndex
CREATE INDEX "direct_credit_requests_decision_idx" ON "direct_credit_requests"("decision");

-- AddForeignKey
ALTER TABLE "direct_credit_requests" ADD CONSTRAINT "direct_credit_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
