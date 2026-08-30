-- DropIndex
DROP INDEX "wallets_chain_address_key";

-- CreateIndex
CREATE UNIQUE INDEX "transactions_referenceTx_key" ON "transactions"("referenceTx");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_chain_address_currency_key" ON "wallets"("chain", "address", "currency");

