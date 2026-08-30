-- AlterEnum
ALTER TYPE "CreditPositionStatus" ADD VALUE 'LIQUIDATED';

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'LIQUIDATION';

-- AlterTable
ALTER TABLE "credit_positions" ADD COLUMN     "liquidationWarning" BOOLEAN NOT NULL DEFAULT false;
