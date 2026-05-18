-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyQuota" INTEGER NOT NULL DEFAULT 10,
    "leadsReceivedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationState" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "turnCounter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AllocationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookIdempotencyKey" (
    "id" SERIAL NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookIdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_serviceId_key" ON "Lead"("phone", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadAssignment_leadId_providerId_key" ON "LeadAssignment"("leadId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationState_serviceId_providerId_key" ON "AllocationState"("serviceId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookIdempotencyKey_idempotencyKey_key" ON "WebhookIdempotencyKey"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationState" ADD CONSTRAINT "AllocationState_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationState" ADD CONSTRAINT "AllocationState_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
