-- CreateEnum
CREATE TYPE "CreditRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- CreateTable
CREATE TABLE "credit_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collateralAmount" DECIMAL(18,6) NOT NULL,
    "currency" "AccountCurrency" NOT NULL DEFAULT 'USD',
    "status" "CreditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "creditPositionId" TEXT,

    CONSTRAINT "credit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_requests_creditPositionId_key" ON "credit_requests"("creditPositionId");

-- CreateIndex
CREATE INDEX "credit_requests_userId_idx" ON "credit_requests"("userId");

-- CreateIndex
CREATE INDEX "credit_requests_status_idx" ON "credit_requests"("status");

-- AddForeignKey
ALTER TABLE "credit_requests" ADD CONSTRAINT "credit_requests_creditPositionId_fkey" FOREIGN KEY ("creditPositionId") REFERENCES "credit_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_requests" ADD CONSTRAINT "credit_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

