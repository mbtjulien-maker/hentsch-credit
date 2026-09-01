-- CreateEnum
CREATE TYPE "WithdrawalMethod" AS ENUM ('CRYPTO', 'SEPA', 'SWIFT');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "bankAccountHolder" TEXT,
ADD COLUMN     "bankBic" TEXT,
ADD COLUMN     "withdrawalCurrency" "AccountCurrency",
ADD COLUMN     "withdrawalMethod" "WithdrawalMethod";
