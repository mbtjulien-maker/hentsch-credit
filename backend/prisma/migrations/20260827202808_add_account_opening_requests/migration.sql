-- CreateEnum
CREATE TYPE "AccountRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "account_opening_requests" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "status" "AccountRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "account_opening_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_opening_requests_userId_key" ON "account_opening_requests"("userId");

-- CreateIndex
CREATE INDEX "account_opening_requests_status_idx" ON "account_opening_requests"("status");

-- CreateIndex
CREATE INDEX "account_opening_requests_email_idx" ON "account_opening_requests"("email");

-- AddForeignKey
ALTER TABLE "account_opening_requests" ADD CONSTRAINT "account_opening_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
