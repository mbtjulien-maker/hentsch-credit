-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('ETHEREUM', 'POLYGON', 'ARBITRUM', 'TRON', 'SOLANA');

-- CreateEnum
CREATE TYPE "StablecoinCurrency" AS ENUM ('USDT', 'USDC', 'EURC');

-- CreateEnum
CREATE TYPE "CreditPositionStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'COLLATERAL_LOCK', 'CREDIT_ISSUED', 'CARD_PAYMENT', 'REPAYMENT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "address" TEXT NOT NULL,
    "currency" "StablecoinCurrency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "lockedCollateral" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "grantedCredit" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "usedCredit" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_positions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collateralAmount" DECIMAL(18,6) NOT NULL,
    "creditIssued" DECIMAL(18,6) NOT NULL,
    "status" "CreditPositionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalCardId" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'PENDING',
    "creditLimit" DECIMAL(18,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "referenceTx" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_chain_address_key" ON "wallets"("chain", "address");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_balances_userId_key" ON "ledger_balances"("userId");

-- CreateIndex
CREATE INDEX "credit_positions_userId_idx" ON "credit_positions"("userId");

-- CreateIndex
CREATE INDEX "credit_positions_status_idx" ON "credit_positions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cards_externalCardId_key" ON "cards"("externalCardId");

-- CreateIndex
CREATE INDEX "cards_userId_idx" ON "cards"("userId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_balances" ADD CONSTRAINT "ledger_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_positions" ADD CONSTRAINT "credit_positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
