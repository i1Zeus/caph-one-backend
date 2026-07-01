/*
  Warnings:

  - A unique constraint covering the columns `[subdomain]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.
  - Made the column `organizationId` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `subdomain` to the `organizations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."UserRoleType" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER');

-- CreateEnum
CREATE TYPE "public"."SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "role" "public"."UserRoleType" NOT NULL DEFAULT 'USER',
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "maxUsers" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "subdomain" TEXT NOT NULL,
ADD COLUMN     "subscriptionTier" "public"."SubscriptionTier" NOT NULL DEFAULT 'FREE';

-- CreateIndex
CREATE UNIQUE INDEX "organizations_subdomain_key" ON "public"."organizations"("subdomain");
