import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDirectSaleDto } from './dto/create-direct-sale.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { SaleQueryDto } from './dto/sale-query.dto';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // HELPER: Generate unique sale number
  // ============================================
  private async generateSaleNumber(
    type: 'QUOTATION' | 'DIRECT',
  ): Promise<string> {
    const prefix = type === 'DIRECT' ? 'DS' : 'SO';
    const lastSale = await this.prisma.sale.findFirst({
      where: { saleType: type },
      orderBy: { id: 'desc' },
      select: { name: true },
    });

    let nextNum = 1;
    if (lastSale?.name) {
      const match = lastSale.name.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  // ============================================
  // HELPER: Generate delivery number
  // ============================================
  private async generateDeliveryNumber(): Promise<string> {
    const lastDelivery = await this.prisma.saleDelivery.findFirst({
      orderBy: { id: 'desc' },
      select: { name: true },
    });

    let nextNum = 1;
    if (lastDelivery?.name) {
      const match = lastDelivery.name.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    return `DEL-${String(nextNum).padStart(4, '0')}`;
  }

  // ============================================
  // HELPER: Calculate item subtotal
  // ============================================
  private calculateItemSubtotal(
    quantity: number,
    unitPrice: number,
    discount: number = 0,
    discountType: string = 'FIXED',
  ): number {
    const rawTotal = quantity * unitPrice;
    if (discount <= 0) return rawTotal;
    if (discountType === 'PERCENTAGE') {
      return rawTotal - (rawTotal * discount) / 100;
    }
    return rawTotal - discount;
  }

  // ============================================
  // HELPER: Get available stock for a product in a warehouse
  // ============================================
  private async getAvailableStock(
    productId: number,
    warehouseId: number,
    tx?: any,
  ): Promise<number> {
    const prismaClient = tx || this.prisma;

    const stock = await prismaClient.stock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
      include: {
        trackings: {
          where: { isActive: true, isDeleted: false },
        },
      },
    });

    if (!stock) return 0;

    const totalOnHand = stock.trackings.reduce(
      (sum: number, t: any) => sum + Number(t.quantity),
      0,
    );

    const reserved = Number(stock.quantityReserved || 0);
    return totalOnHand - reserved;
  }

  // ============================================
  // HELPER: Deduct stock from trackings (FIFO)
  // ============================================
  private async deductStock(
    productId: number,
    warehouseId: number,
    quantity: number,
    tx: any,
  ): Promise<void> {
    const stock = await tx.stock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
      include: {
        trackings: {
          where: { isActive: true, isDeleted: false },
          orderBy: { createdAt: 'asc' }, // FIFO
        },
      },
    });

    if (!stock) {
      throw new BadRequestException(
        `No stock record for product ${productId} in warehouse ${warehouseId}`,
      );
    }

    let remaining = quantity;

    for (const tracking of stock.trackings) {
      if (remaining <= 0) break;

      const trackingQty = Number(tracking.quantity);
      const deductQty = Math.min(trackingQty, remaining);

      await tx.tracking.update({
        where: { id: tracking.id },
        data: {
          quantity: new Decimal(trackingQty - deductQty),
          ...(trackingQty - deductQty <= 0 ? { isActive: false } : {}),
        },
      });

      remaining -= deductQty;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `Insufficient stock for product ${productId}. Short by ${remaining}`,
      );
    }
  }

  // ============================================
  // 1. CREATE DIRECT SALE (One-Step)
  // ============================================
  async createDirectSale(dto: CreateDirectSaleDto, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate all items have sufficient stock
      for (const item of dto.items) {
        const available = await this.getAvailableStock(
          item.productId,
          dto.warehouseId,
          tx,
        );
        if (available < item.quantity) {
          // Get product name for better error message
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          throw new BadRequestException(
            `Insufficient stock for "${product?.name || item.productId}". Available: ${available}, Requested: ${item.quantity}`,
          );
        }
      }

      // 2. Calculate totals
      const taxRate = dto.taxRate || 0;
      let amountUntaxed = 0;

      const itemsData = dto.items.map((item) => {
        const subtotal = this.calculateItemSubtotal(
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.discountType || 'FIXED',
        );
        amountUntaxed += subtotal;
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 'FIXED',
          subtotal,
        };
      });

      // Apply global discount
      if (dto.discount && dto.discount > 0) {
        if (dto.discountType === 'PERCENTAGE') {
          amountUntaxed = amountUntaxed - (amountUntaxed * dto.discount) / 100;
        } else {
          amountUntaxed = amountUntaxed - dto.discount;
        }
      }

      const amountTax = (amountUntaxed * taxRate) / 100;
      const amountTotal = amountUntaxed + amountTax;

      // 3. Generate sale number
      const saleName = await this.generateSaleNumber('DIRECT');

      // 4. Create the sale record
      const sale = await tx.sale.create({
        data: {
          name: saleName,
          saleType: 'DIRECT',
          status: 'COMPLETED',
          clientId: dto.clientId,
          warehouseId: dto.warehouseId,
          dateCompleted: new Date(),
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentStatus || 'PAID',
          amountUntaxed,
          taxRate,
          amountTax,
          amountTotal,
          discount: dto.discount || 0,
          discountType: dto.discountType || 'FIXED',
          notes: dto.notes,
          userId,
          items: {
            create: itemsData.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              quantityDelivered: item.quantity, // Fully delivered immediately
              unitPrice: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          client: true,
        },
      });

      // 5. Create warehouse transaction (SALE type) and deduct stock
      const warehouseTransaction = await tx.warehouseTransaction.create({
        data: {
          type: 'SALE',
          fromWarehouseId: dto.warehouseId,
          totalPrice: amountTotal,
          date: new Date(),
          note: `Direct Sale ${saleName}`,
          referenceNumber: saleName,
          userId,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
      });

      // 6. Deduct stock from trackings for each item
      for (const item of dto.items) {
        await this.deductStock(
          item.productId,
          dto.warehouseId,
          item.quantity,
          tx,
        );
      }

      // 7. Link the warehouse transaction to the sale
      await tx.sale.update({
        where: { id: sale.id },
        data: { warehouseTransactionId: warehouseTransaction.id },
      });

      this.logger.log(
        `Direct sale ${saleName} created successfully. Total: ${amountTotal}`,
      );

      return sale;
    });
  }

  // ============================================
  // 2. CREATE QUOTATION (Draft)
  // ============================================
  async createQuotation(dto: CreateQuotationDto, userId?: string) {
    const taxRate = dto.taxRate || 0;
    let amountUntaxed = 0;

    const itemsData = dto.items.map((item) => {
      const subtotal = this.calculateItemSubtotal(
        item.quantity,
        item.unitPrice,
        item.discount || 0,
        item.discountType || 'FIXED',
      );
      amountUntaxed += subtotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        discountType: item.discountType || 'FIXED',
        subtotal,
      };
    });

    // Apply global discount
    if (dto.discount && dto.discount > 0) {
      if (dto.discountType === 'PERCENTAGE') {
        amountUntaxed = amountUntaxed - (amountUntaxed * dto.discount) / 100;
      } else {
        amountUntaxed = amountUntaxed - dto.discount;
      }
    }

    const amountTax = (amountUntaxed * taxRate) / 100;
    const amountTotal = amountUntaxed + amountTax;
    const saleName = await this.generateSaleNumber('QUOTATION');

    const sale = await this.prisma.sale.create({
      data: {
        name: saleName,
        saleType: 'QUOTATION',
        status: 'DRAFT',
        clientId: dto.clientId,
        warehouseId: dto.warehouseId,
        validityDate: dto.validityDate ? new Date(dto.validityDate) : null,
        amountUntaxed,
        taxRate,
        amountTax,
        amountTotal,
        discount: dto.discount || 0,
        discountType: dto.discountType || 'FIXED',
        notes: dto.notes,
        userId,
        items: {
          create: itemsData.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            discountType: item.discountType,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
        client: true,
      },
    });

    this.logger.log(`Quotation ${saleName} created successfully`);
    return sale;
  }

  // ============================================
  // 3. CONFIRM QUOTATION → Reserve Stock
  // ============================================
  async confirmQuotation(saleId: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { product: true } } },
      });

      if (!sale || sale.isDeleted) {
        throw new NotFoundException('Sale not found');
      }
      if (sale.saleType !== 'QUOTATION') {
        throw new BadRequestException('Only quotations can be confirmed');
      }
      if (sale.status !== 'DRAFT' && sale.status !== 'SENT') {
        throw new BadRequestException(
          `Cannot confirm a sale with status: ${sale.status}`,
        );
      }

      // Check availability and reserve stock
      for (const item of sale.items) {
        const available = await this.getAvailableStock(
          item.productId,
          sale.warehouseId,
          tx,
        );
        if (available < Number(item.quantity)) {
          throw new BadRequestException(
            `Insufficient stock for "${item.product.name}". Available: ${available}, Required: ${Number(item.quantity)}`,
          );
        }

        // Reserve stock
        await tx.stock.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: sale.warehouseId,
            },
          },
          data: {
            quantityReserved: {
              increment: new Decimal(Number(item.quantity)),
            },
          },
        });
      }

      // Update sale status
      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: 'CONFIRMED',
          dateConfirmed: new Date(),
        },
      });

      // Create a delivery order (DRAFT)
      const deliveryName = await this.generateDeliveryNumber();
      await tx.saleDelivery.create({
        data: {
          name: deliveryName,
          saleId: sale.id,
          status: 'DRAFT',
        },
      });

      this.logger.log(
        `Quotation ${sale.name} confirmed. Stock reserved. Delivery ${deliveryName} created.`,
      );

      return this.findOne(saleId);
    });
  }

  // ============================================
  // 4. VALIDATE DELIVERY → Deduct Stock
  // ============================================
  async validateDelivery(deliveryId: number, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.saleDelivery.findUnique({
        where: { id: deliveryId },
        include: {
          sale: {
            include: {
              items: { include: { product: true } },
            },
          },
        },
      });

      if (!delivery || delivery.isDeleted) {
        throw new NotFoundException('Delivery not found');
      }
      if (delivery.status !== 'DRAFT' && delivery.status !== 'READY') {
        throw new BadRequestException(
          `Cannot validate delivery with status: ${delivery.status}`,
        );
      }

      const sale = delivery.sale;
      if (sale.status !== 'CONFIRMED' && sale.status !== 'PARTIAL') {
        throw new BadRequestException(
          `Sale status ${sale.status} does not allow delivery validation`,
        );
      }

      // For each item, deduct stock and update delivered quantity
      const transactionItems: any[] = [];
      for (const item of sale.items) {
        const qtyToDeliver =
          Number(item.quantity) - Number(item.quantityDelivered);
        if (qtyToDeliver <= 0) continue;

        // Deduct stock from trackings
        await this.deductStock(
          item.productId,
          sale.warehouseId,
          qtyToDeliver,
          tx,
        );

        // Release reservation
        await tx.stock.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: sale.warehouseId,
            },
          },
          data: {
            quantityReserved: {
              decrement: new Decimal(qtyToDeliver),
            },
          },
        });

        // Update delivered quantity on item
        await tx.saleItem.update({
          where: { id: item.id },
          data: {
            quantityDelivered: new Decimal(Number(item.quantity)),
          },
        });

        transactionItems.push({
          productId: item.productId,
          quantity: qtyToDeliver,
          unitPrice: Number(item.unitPrice),
          totalPrice: qtyToDeliver * Number(item.unitPrice),
        });
      }

      // Create warehouse transaction
      const warehouseTransaction = await tx.warehouseTransaction.create({
        data: {
          type: 'SALE',
          fromWarehouseId: sale.warehouseId,
          totalPrice: Number(sale.amountTotal),
          date: new Date(),
          note: `Delivery ${delivery.name} for Sale ${sale.name}`,
          referenceNumber: delivery.name,
          userId,
          items: {
            create: transactionItems,
          },
        },
      });

      // Update delivery status
      await tx.saleDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DONE',
          warehouseTransactionId: warehouseTransaction.id,
        },
      });

      // Update sale status to COMPLETED
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'COMPLETED',
          dateCompleted: new Date(),
          warehouseTransactionId: warehouseTransaction.id,
        },
      });

      this.logger.log(
        `Delivery ${delivery.name} validated. Stock deducted for sale ${sale.name}.`,
      );

      return this.findOne(sale.id);
    });
  }

  // ============================================
  // 5. CANCEL SALE
  // ============================================
  async cancelSale(saleId: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true, deliveries: true },
      });

      if (!sale || sale.isDeleted) {
        throw new NotFoundException('Sale not found');
      }
      if (sale.status === 'CANCELLED') {
        throw new BadRequestException('Sale is already cancelled');
      }
      if (sale.status === 'COMPLETED') {
        throw new BadRequestException('Cannot cancel a completed sale');
      }

      // If CONFIRMED, release reserved stock
      if (sale.status === 'CONFIRMED' || sale.status === 'PARTIAL') {
        for (const item of sale.items) {
          const qtyToRelease =
            Number(item.quantity) - Number(item.quantityDelivered);
          if (qtyToRelease > 0) {
            await tx.stock.update({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: sale.warehouseId,
                },
              },
              data: {
                quantityReserved: {
                  decrement: new Decimal(qtyToRelease),
                },
              },
            });
          }
        }

        // Cancel pending deliveries
        for (const delivery of sale.deliveries) {
          if (delivery.status !== 'DONE' && delivery.status !== 'CANCELLED') {
            await tx.saleDelivery.update({
              where: { id: delivery.id },
              data: { status: 'CANCELLED' },
            });
          }
        }
      }

      await tx.sale.update({
        where: { id: saleId },
        data: { status: 'CANCELLED' },
      });

      this.logger.log(`Sale ${sale.name} cancelled`);
      return this.findOne(saleId);
    });
  }

  // ============================================
  // 6. FIND ALL (List with filters)
  // ============================================
  async findAll(query: SaleQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      saleType,
      status,
      dateFrom,
      dateTo,
      clientId,
    } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isDeleted: false,
    };

    if (saleType) {
      where.saleType = saleType;
    }
    if (status) {
      where.status = status;
    }
    if (clientId) {
      where.clientId = Number(clientId);
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where.dateOrder = {};
      if (dateFrom) where.dateOrder.gte = new Date(dateFrom);
      if (dateTo) where.dateOrder.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { id: 'desc' },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          items: {
            include: { product: { select: { id: true, name: true } } },
          },
          deliveries: {
            select: { id: true, name: true, status: true },
          },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  // ============================================
  // 7. FIND ONE (Detail)
  // ============================================
  async findOne(saleId: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        client: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                salePrice: true,
                imageUrl: true,
              },
            },
          },
        },
        deliveries: {
          orderBy: { id: 'desc' },
        },
        user: { select: { id: true, name: true } },
      },
    });

    if (!sale || sale.isDeleted) {
      throw new NotFoundException('Sale not found');
    }

    return sale;
  }

  // ============================================
  // 8. DASHBOARD STATS
  // ============================================
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayDirectSales,
      todayDirectTotal,
      openQuotations,
      confirmedOrders,
      pendingDeliveries,
      totalSalesThisMonth,
      recentSales,
    ] = await Promise.all([
      // Today's direct sales count
      this.prisma.sale.count({
        where: {
          saleType: 'DIRECT',
          status: 'COMPLETED',
          isDeleted: false,
          dateOrder: { gte: today, lt: tomorrow },
        },
      }),
      // Today's direct sales total
      this.prisma.sale.aggregate({
        _sum: { amountTotal: true },
        where: {
          saleType: 'DIRECT',
          status: 'COMPLETED',
          isDeleted: false,
          dateOrder: { gte: today, lt: tomorrow },
        },
      }),
      // Open quotations
      this.prisma.sale.count({
        where: {
          saleType: 'QUOTATION',
          status: { in: ['DRAFT', 'SENT'] },
          isDeleted: false,
        },
      }),
      // Confirmed orders (awaiting delivery)
      this.prisma.sale.count({
        where: {
          saleType: 'QUOTATION',
          status: 'CONFIRMED',
          isDeleted: false,
        },
      }),
      // Pending deliveries
      this.prisma.saleDelivery.count({
        where: {
          status: { in: ['DRAFT', 'READY'] },
          isDeleted: false,
        },
      }),
      // Total sales this month
      this.prisma.sale.aggregate({
        _sum: { amountTotal: true },
        _count: true,
        where: {
          status: 'COMPLETED',
          isDeleted: false,
          dateOrder: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
      }),
      // Recent 5 sales
      this.prisma.sale.findMany({
        where: { isDeleted: false },
        orderBy: { id: 'desc' },
        take: 5,
        include: {
          client: { select: { id: true, name: true } },
          items: { select: { id: true } },
        },
      }),
    ]);

    return {
      todayDirectSales: {
        count: todayDirectSales,
        total: Number(todayDirectTotal._sum.amountTotal || 0),
      },
      openQuotations,
      confirmedOrders,
      pendingDeliveries,
      thisMonth: {
        count: totalSalesThisMonth._count,
        total: Number(totalSalesThisMonth._sum.amountTotal || 0),
      },
      recentSales,
    };
  }

  // ============================================
  // 9. GET PRODUCTS WITH STOCK (for POS-style view)
  // ============================================
  async getProductsWithStock(warehouseId: number, search?: string) {
    const where: any = {
      isDeleted: false,
      isActive: true,
      type: 'PRODUCT',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        salesUnit: true,
        categories: {
          include: { category: true },
        },
        stocks: {
          where: { warehouseId: Number(warehouseId) },
          include: {
            trackings: {
              where: { isActive: true, isDeleted: false },
            },
          },
        },
      },
    });

    return products.map((product) => {
      const stock = product.stocks[0];
      const onHand = stock
        ? stock.trackings.reduce((sum, t) => sum + Number(t.quantity), 0)
        : 0;
      const reserved = stock ? Number(stock.quantityReserved || 0) : 0;
      const available = onHand - reserved;

      return {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        salePrice: Number(product.salePrice || 0),
        imageUrl: product.imageUrl,
        salesUnit: product.salesUnit
          ? { id: product.salesUnit.id, name: product.salesUnit.name }
          : null,
        categories: product.categories.map((c) => ({
          id: c.category.id,
          name: c.category.name,
        })),
        stock: {
          onHand,
          reserved,
          available,
        },
      };
    });
  }

  // ============================================
  // 10. GET ALL DELIVERIES
  // ============================================
  async getDeliveries(query: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 20, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { isDeleted: false };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.saleDelivery.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { id: 'desc' },
        include: {
          sale: {
            select: {
              id: true,
              name: true,
              saleType: true,
              client: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.saleDelivery.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }
}
