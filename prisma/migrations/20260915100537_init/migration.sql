-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('BUY', 'RENT', 'OFFPLAN');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'VILLA', 'TOWNHOUSE', 'PENTHOUSE', 'DUPLEX', 'MANSION', 'HOTEL_APARTMENT', 'OFFICE');

-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('READY', 'OFF_PLAN');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'VIEWING_SCHEDULED', 'OFFER_MADE', 'CONTRACT_SIGNED', 'CLOSED', 'LOST');

-- CreateTable
CREATE TABLE "community" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "avgPricePerSqft" DOUBLE PRECISION NOT NULL,
    "avgRentPerSqft" DOUBLE PRECISION NOT NULL,
    "avgGrossYield" DOUBLE PRECISION NOT NULL,
    "serviceChargeAvg" DOUBLE PRECISION NOT NULL,
    "lifestyleTags" TEXT[],
    "schools" TEXT[],
    "metroAccess" TEXT NOT NULL,
    "beachProximity" TEXT NOT NULL,
    "heroImage" TEXT NOT NULL,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property" (
    "id" TEXT NOT NULL,
    "refNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "communityId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "beds" INTEGER NOT NULL,
    "baths" INTEGER NOT NULL,
    "sizeSqft" DOUBLE PRECISION NOT NULL,
    "serviceChargePerSqft" DOUBLE PRECISION NOT NULL,
    "amenities" TEXT[],
    "view" TEXT NOT NULL,
    "furnishing" "Furnishing" NOT NULL,
    "developer" TEXT NOT NULL,
    "handoverDate" TIMESTAMP(3),
    "paymentPlan" TEXT,
    "completionStatus" "CompletionStatus" NOT NULL,
    "dldPermit" TEXT NOT NULL,
    "images" TEXT[],
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "languages" TEXT[],
    "specializationCommunities" TEXT[],
    "specializationTypes" TEXT[],
    "dealsClosed" INTEGER NOT NULL,
    "avgDealSize" DOUBLE PRECISION NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "yearsExperience" INTEGER NOT NULL,
    "reraBrn" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry" (
    "id" TEXT NOT NULL,
    "rawQuery" TEXT NOT NULL,
    "intent" JSONB NOT NULL,
    "propertyIds" TEXT[],
    "communityIds" TEXT[],
    "matchedBrokerId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "stage" "DealStage" NOT NULL DEFAULT 'NEW',
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_slug_key" ON "community"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "property_refNo_key" ON "property"("refNo");

-- CreateIndex
CREATE INDEX "property_communityId_idx" ON "property"("communityId");

-- CreateIndex
CREATE INDEX "property_listingType_propertyType_idx" ON "property"("listingType", "propertyType");

-- CreateIndex
CREATE INDEX "property_price_idx" ON "property"("price");

-- CreateIndex
CREATE INDEX "property_deletedAt_idx" ON "property"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "broker_slug_key" ON "broker"("slug");

-- CreateIndex
CREATE INDEX "broker_deletedAt_idx" ON "broker"("deletedAt");

-- CreateIndex
CREATE INDEX "enquiry_stage_idx" ON "enquiry"("stage");

-- CreateIndex
CREATE INDEX "enquiry_agentId_idx" ON "enquiry"("agentId");

-- CreateIndex
CREATE INDEX "enquiry_createdAt_idx" ON "enquiry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "property" ADD CONSTRAINT "property_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry" ADD CONSTRAINT "enquiry_matchedBrokerId_fkey" FOREIGN KEY ("matchedBrokerId") REFERENCES "broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry" ADD CONSTRAINT "enquiry_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
