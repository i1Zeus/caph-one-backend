-- AlterTable
ALTER TABLE "public"."property_requests" ADD COLUMN     "entityType" "public"."EntityType";

-- CreateIndex
CREATE INDEX "property_requests_entityType_idx" ON "public"."property_requests"("entityType");
