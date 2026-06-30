-- AlterTable
ALTER TABLE "public"."property_contracts" ADD COLUMN     "agreementDate" TIMESTAMP(3),
ADD COLUMN     "chamberOfCommerceStamp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contractAmountInWriting" TEXT,
ADD COLUMN     "rentBreachPenalty" DECIMAL(15,2),
ADD COLUMN     "rentDuration" TEXT,
ADD COLUMN     "rentFeesResponsibility" TEXT,
ADD COLUMN     "rentPaymentTerms" TEXT,
ADD COLUMN     "rentRefusalTerms" TEXT,
ADD COLUMN     "securityDeposit" DECIMAL(15,2);
