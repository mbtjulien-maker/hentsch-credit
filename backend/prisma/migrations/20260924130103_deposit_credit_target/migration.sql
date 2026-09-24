-- CreateEnum
CREATE TYPE "CreditTarget" AS ENUM ('AVAILABLE', 'INVESTMENT');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "creditTarget" "CreditTarget" NOT NULL DEFAULT 'AVAILABLE';
