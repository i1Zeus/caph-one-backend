-- CreateEnum
CREATE TYPE "public"."SaleType" AS ENUM ('QUOTATION', 'DIRECT');

-- CreateEnum
CREATE TYPE "public"."SaleStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "public"."SalePaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL_PAYMENT', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."SaleDeliveryStatus" AS ENUM ('DRAFT', 'READY', 'DONE', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."stocks" ADD COLUMN     "quantityReserved" DECIMAL(15,3) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."sales" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "saleType" "public"."SaleType" NOT NULL DEFAULT 'QUOTATION',
    "status" "public"."SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" INTEGER,
    "warehouseId" INTEGER NOT NULL,
    "dateOrder" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateConfirmed" TIMESTAMP(3),
    "dateCompleted" TIMESTAMP(3),
    "validityDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentStatus" "public"."SalePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountUntaxed" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amountTax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amountTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountType" "public"."DiscountType" NOT NULL DEFAULT 'FIXED',
    "notes" TEXT,
    "userId" TEXT,
    "warehouseTransactionId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sale_items" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "quantityDelivered" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountType" "public"."DiscountType" NOT NULL DEFAULT 'FIXED',
    "subtotal" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sale_deliveries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "saleId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."SaleDeliveryStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "warehouseTransactionId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_name_key" ON "public"."sales"("name");

-- CreateIndex
CREATE INDEX "sales_saleType_idx" ON "public"."sales"("saleType");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "public"."sales"("status");

-- CreateIndex
CREATE INDEX "sales_clientId_idx" ON "public"."sales"("clientId");

-- CreateIndex
CREATE INDEX "sales_dateOrder_idx" ON "public"."sales"("dateOrder");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "public"."sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_productId_idx" ON "public"."sale_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_deliveries_name_key" ON "public"."sale_deliveries"("name");

-- CreateIndex
CREATE INDEX "sale_deliveries_saleId_idx" ON "public"."sale_deliveries"("saleId");

-- CreateIndex
CREATE INDEX "sale_deliveries_status_idx" ON "public"."sale_deliveries"("status");
