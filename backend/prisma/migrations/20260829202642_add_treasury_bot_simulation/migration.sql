-- CreateTable
CREATE TABLE "treasury_bot_runs" (
    "id" TEXT NOT NULL,
    "runDate" DATE NOT NULL,
    "pillarAReturnPct" DECIMAL(9,6) NOT NULL,
    "pillarBReturnPct" DECIMAL(9,6) NOT NULL,
    "pillarCReturnPct" DECIMAL(9,6) NOT NULL,
    "blendedReturnPct" DECIMAL(9,6) NOT NULL,
    "marketSignalPct" DECIMAL(9,6) NOT NULL,
    "notionalCapitalUsd" DECIMAL(18,2) NOT NULL,
    "dailyPnlUsd" DECIMAL(18,2) NOT NULL,
    "cumulativeNavUsd" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_bot_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "treasury_bot_runs_runDate_key" ON "treasury_bot_runs"("runDate");
