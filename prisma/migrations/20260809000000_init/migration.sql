-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "authType" TEXT NOT NULL DEFAULT 'bearer',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProviderAPIKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "organization" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderAPIKey_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProviderModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxContext" INTEGER,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsImage" BOOLEAN NOT NULL DEFAULT false,
    "supportsReasoning" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InboundAPIKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "keyEncrypted" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "routingStrategy" TEXT NOT NULL DEFAULT 'fixed',
    "rateLimitRPM" INTEGER,
    "rateLimitTPM" INTEGER,
    "dailyLimit" INTEGER,
    "monthlyLimit" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InboundModelPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT NOT NULL,
    "providerModelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "rateLimitRPM" INTEGER,
    "rateLimitTPM" INTEGER,
    "dailyLimit" INTEGER,
    "monthlyLimit" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InboundModelPermission_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "InboundAPIKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InboundModelPermission_providerModelId_fkey" FOREIGN KEY ("providerModelId") REFERENCES "ProviderModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT,
    "providerId" TEXT,
    "providerModelId" TEXT,
    "endpoint" TEXT,
    "model" TEXT,
    "requestTokens" INTEGER NOT NULL DEFAULT 0,
    "responseTokens" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "latency" INTEGER NOT NULL DEFAULT 0,
    "stream" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "InboundAPIKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UsageLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UsageLog_providerModelId_fkey" FOREIGN KEY ("providerModelId") REFERENCES "ProviderModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_key" ON "Provider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderModel_providerId_modelId_key" ON "ProviderModel"("providerId", "modelId");

-- CreateIndex
CREATE UNIQUE INDEX "InboundAPIKey_name_key" ON "InboundAPIKey"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InboundAPIKey_key_key" ON "InboundAPIKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "InboundModelPermission_apiKeyId_providerModelId_key" ON "InboundModelPermission"("apiKeyId", "providerModelId");

-- CreateIndex
CREATE INDEX "UsageLog_apiKeyId_idx" ON "UsageLog"("apiKeyId");

-- CreateIndex
CREATE INDEX "UsageLog_providerId_idx" ON "UsageLog"("providerId");

-- CreateIndex
CREATE INDEX "UsageLog_providerModelId_idx" ON "UsageLog"("providerModelId");

-- CreateIndex
CREATE INDEX "UsageLog_createdAt_idx" ON "UsageLog"("createdAt");
