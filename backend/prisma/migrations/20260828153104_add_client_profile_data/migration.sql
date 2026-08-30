-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PARTICULIER', 'INDEPENDANT', 'ENTREPRISE');

-- CreateEnum
CREATE TYPE "AddressLabel" AS ENUM ('DOMICILE', 'FISCALE', 'POSTALE', 'PROFESSIONNELLE');

-- CreateTable
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "placeOfBirth" TEXT,
    "nationality" TEXT,
    "maritalStatus" TEXT,
    "dependents" INTEGER,
    "phone" TEXT,
    "clientType" "ClientType" NOT NULL DEFAULT 'PARTICULIER',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" "AddressLabel" NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "residenceType" TEXT,
    "since" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isIndependent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "employer" TEXT,
    "sector" TEXT,
    "role" TEXT,
    "seniority" TEXT,
    "annualIncome" DECIMAL(18,2),
    "monthlyIncome" DECIMAL(18,2),
    "contractType" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "activity" TEXT,
    "turnover" DECIMAL(18,2),
    "netResult" DECIMAL(18,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "income" JSONB,
    "expenses" JSONB,
    "assets" JSONB,
    "liabilities" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_userId_key" ON "client_profiles"("userId");

-- CreateIndex
CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_userId_label_key" ON "addresses"("userId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "employments_userId_key" ON "employments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_snapshots_userId_key" ON "financial_snapshots"("userId");

-- CreateIndex
CREATE INDEX "client_notes_userId_idx" ON "client_notes"("userId");

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_snapshots" ADD CONSTRAINT "financial_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
