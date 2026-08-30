-- CreateTable
CREATE TABLE "client_managed_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_managed_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_managed_wallets_userId_key" ON "client_managed_wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_managed_wallets_reference_key" ON "client_managed_wallets"("reference");

-- AddForeignKey
ALTER TABLE "client_managed_wallets" ADD CONSTRAINT "client_managed_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
