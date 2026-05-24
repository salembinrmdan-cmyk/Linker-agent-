-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "SurveyCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyCustomer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "city" TEXT,
    "segment" TEXT,
    "optOut" BOOLEAN NOT NULL DEFAULT false,
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "platforms" TEXT,
    "preferredPlatform" TEXT,
    "purchaseMethod" TEXT,
    "purchaseMethodRaw" TEXT,
    "brokerType" TEXT,
    "brokerSource" TEXT,
    "brokerName" TEXT,
    "brokerPlatform" TEXT,
    "brokerReason" TEXT,
    "deliveryTime" TEXT,
    "cashOnDelivery" TEXT,
    "hasProblems" BOOLEAN,
    "mainProblem" TEXT,
    "orderValue" TEXT,
    "purchaseFrequency" TEXT,
    "ageGroup" TEXT,
    "gender" TEXT,
    "paymentPreference" TEXT,
    "canceledBefore" BOOLEAN,
    "cancelReason" TEXT,
    "biggestAnnoyance" TEXT,
    "directPurchaseProb" TEXT,
    "directEncouragement" TEXT,
    "directHesitation" TEXT,
    "refusalReason" TEXT,
    "rawChatLog" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketBroker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "type" TEXT,
    "gender" TEXT,
    "channel" TEXT,
    "associatedCity" TEXT,
    "coverageCities" TEXT,
    "platforms" TEXT,
    "problemScore" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "marketInfluence" INTEGER NOT NULL DEFAULT 0,
    "mentionCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketBroker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPlatform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "brokerDepRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "problemScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySession" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currentState" TEXT NOT NULL DEFAULT 'GREETING',
    "extractedData" JSONB NOT NULL DEFAULT '{}',
    "rawLogs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "direction" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "campaignId" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL,
    "text" TEXT,
    "error" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEventLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "route" TEXT,
    "customer" TEXT,
    "campaign" TEXT,
    "session" TEXT,
    "message" TEXT,
    "reason" TEXT,
    "action" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyCustomer_phone_key" ON "SurveyCustomer"("phone");

-- CreateIndex
CREATE INDEX "SurveyResponse_campaignId_idx" ON "SurveyResponse"("campaignId");

-- CreateIndex
CREATE INDEX "SurveyResponse_customerId_idx" ON "SurveyResponse"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_campaignId_customerId_key" ON "SurveyResponse"("campaignId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketBroker_normalizedName_key" ON "MarketBroker"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "MarketPlatform_normalizedName_key" ON "MarketPlatform"("normalizedName");

-- CreateIndex
CREATE INDEX "SurveySession_phone_idx" ON "SurveySession"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappMessage_providerMessageId_key" ON "WhatsappMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_phone_idx" ON "WhatsappMessage"("phone");

-- CreateIndex
CREATE INDEX "WhatsappMessage_campaignId_idx" ON "WhatsappMessage"("campaignId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_sessionId_idx" ON "WhatsappMessage"("sessionId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_direction_status_idx" ON "WhatsappMessage"("direction", "status");

-- CreateIndex
CREATE INDEX "SystemEventLog_level_idx" ON "SystemEventLog"("level");

-- CreateIndex
CREATE INDEX "SystemEventLog_type_idx" ON "SystemEventLog"("type");

-- CreateIndex
CREATE INDEX "SystemEventLog_createdAt_idx" ON "SystemEventLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemEventLog_campaign_idx" ON "SystemEventLog"("campaign");

-- CreateIndex
CREATE INDEX "SystemEventLog_session_idx" ON "SystemEventLog"("session");

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SurveyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SurveyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySession" ADD CONSTRAINT "SurveySession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SurveyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

