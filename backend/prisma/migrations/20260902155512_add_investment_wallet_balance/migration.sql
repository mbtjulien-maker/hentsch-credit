-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'INVESTMENT_WALLET_TRANSFER_IN';
ALTER TYPE "TransactionType" ADD VALUE 'INVESTMENT_WALLET_TRANSFER_OUT';

-- AlterTable
ALTER TABLE "ledger_balances" ADD COLUMN     "investmentBalance" DECIMAL(18,6) NOT NULL DEFAULT 0;

