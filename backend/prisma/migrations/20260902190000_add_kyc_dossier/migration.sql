-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "addressLine2" TEXT;

-- AlterTable
ALTER TABLE "client_profiles" ADD COLUMN     "additionalTaxResidence" TEXT,
ADD COLUMN     "birthCountry" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "secondNationality" TEXT,
ADD COLUMN     "taxIdNumber" TEXT,
ADD COLUMN     "taxResidenceCountry" TEXT,
ADD COLUMN     "usageLastName" TEXT;

-- AlterTable
ALTER TABLE "employments" ADD COLUMN     "annualIncomeBracket" TEXT,
ADD COLUMN     "netWorthBracket" TEXT,
ADD COLUMN     "professionalStatus" TEXT;

-- CreateTable
CREATE TABLE "identity_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "issuingAuthority" TEXT,
    "issuePlace" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "identityCheckMethod" TEXT,
    "proofOfAddressType" TEXT,
    "proofOfAddressIssuer" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aml_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPoliticallyExposed" BOOLEAN,
    "fundsOrigin" TEXT[],
    "fundsOriginOther" TEXT,
    "relationshipPurpose" TEXT[],
    "attestedAt" TIMESTAMP(3),
    "attestationCity" TEXT,
    "riskLevel" TEXT,
    "reviewDecision" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aml_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity_documents_userId_key" ON "identity_documents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "aml_profiles_userId_key" ON "aml_profiles"("userId");

-- AddForeignKey
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_profiles" ADD CONSTRAINT "aml_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_profiles" ADD CONSTRAINT "aml_profiles_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

