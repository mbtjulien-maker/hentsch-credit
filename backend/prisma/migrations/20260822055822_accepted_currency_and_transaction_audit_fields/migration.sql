-- CreateEnum
CREATE TYPE "AcceptedCurrency" AS ENUM ('USDS', 'DAI', 'USDE', 'PYUSD', 'PAXG', 'XAUT');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "currency" "AcceptedCurrency",
ADD COLUMN     "tokenAmount" DECIMAL(28,8);

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "currency",
ADD COLUMN     "currency" "AcceptedCurrency" NOT NULL;

-- DropEnum
DROP TYPE "StablecoinCurrency";

-- CreateIndex
CREATE UNIQUE INDEX "wallets_chain_address_currency_key" ON "wallets"("chain", "address", "currency");

