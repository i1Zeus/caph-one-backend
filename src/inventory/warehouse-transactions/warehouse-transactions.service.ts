import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WarehouseTransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateWarehouseTransactionDto,
  WarehouseTransactionItemDto,
} from './dto';
import { UpdateWarehouseTransactionDto } from './dto/update-warehouse-transaction.dto';
import { WarehouseTransactionQueryDto } from './dto/warehouse-transaction-query.dto';
import {
  WarehouseTransaction,
  WarehouseTransactionItem,
} from './entities/warehouse-transaction.entity';

@Injectable()
export class WarehouseTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private transformTransaction(transaction: any): WarehouseTransaction {
    return new WarehouseTransaction({
      ...transaction,
      totalPrice: transaction.totalPrice
        ? Number(transaction.totalPrice)
        : null,
      items:
        transaction.items?.map(
          (item: any) =>
            new WarehouseTransactionItem({
              ...item,
              quantity: Number(item.quantity),
              unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
              totalPrice: item.totalPrice ? Number(item.totalPrice) : null,
              product: item.product
                ? {
                    ...item.product,
                    purchasePrice: item.product.purchasePrice
                      ? Number(item.product.purchasePrice)
                      : null,
                    salePrice: item.product.salePrice
                      ? Number(item.product.salePrice)
                      : null,
                  }
                : undefined,
              unit: item.unit
                ? {
                    ...item.unit,
                  }
                : undefined,
              tracking: item.tracking
                ? {
                    ...item.tracking,
                    quantity: Number(item.tracking.quantity),
                  }
                : undefined,
            }),
        ) || [],
    });
  }

  async create(
    createTransactionDto: CreateWarehouseTransactionDto,
  ): Promise<WarehouseTransaction> {
    // Support both old single-item format and new multi-item format
    let itemsToProcess: WarehouseTransactionItemDto[] = [];

    if (createTransactionDto.items && createTransactionDto.items.length > 0) {
      // New multi-item format
      itemsToProcess = createTransactionDto.items;
    } else if (
      createTransactionDto.productId &&
      createTransactionDto.quantity
    ) {
      // Old single-item format - convert to new format
      itemsToProcess = [
        {
          productId: createTransactionDto.productId,
          quantity: createTransactionDto.quantity,
          trackingId: createTransactionDto.trackingId,
          unitId: createTransactionDto.unitId,
          unitPrice: createTransactionDto.unitPrice,
          totalPrice: createTransactionDto.totalPrice,
        },
      ];
    } else {
      throw new BadRequestException(
        'يجب تحديد إما منتج واحد أو قائمة المنتجات',
      );
    }

    // Validate all products exist
    const productIds = itemsToProcess.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('بعض المنتجات غير موجودة');
    }

    // Validate that services cannot be added to warehouses
    const serviceProducts = products.filter((p) => p.type === 'SERVICE');
    if (serviceProducts.length > 0) {
      const serviceNames = serviceProducts.map((p) => p.name).join(', ');
      throw new BadRequestException(
        `لا يمكن إضافة الخدمات إلى المخازن: ${serviceNames}`,
      );
    }

    // Validate warehouses
    const warehouseIds = new Set<number>();

    // Add main transaction warehouses
    if (createTransactionDto.fromWarehouseId)
      warehouseIds.add(createTransactionDto.fromWarehouseId);
    if (createTransactionDto.toWarehouseId)
      warehouseIds.add(createTransactionDto.toWarehouseId);

    // Add item-specific warehouses (if they exist in the DTO)
    itemsToProcess.forEach((item) => {
      if ('fromWarehouseId' in item && item.fromWarehouseId)
        warehouseIds.add(item.fromWarehouseId as number);
      if ('toWarehouseId' in item && item.toWarehouseId)
        warehouseIds.add(item.toWarehouseId as number);
    });

    if (warehouseIds.size > 0) {
      const warehouses = await this.prisma.warehouse.findMany({
        where: { id: { in: Array.from(warehouseIds) } },
      });

      if (warehouses.length !== warehouseIds.size) {
        throw new NotFoundException('بعض المخازن غير موجودة');
      }
    }

    // Validate transaction type
    await this.validateTransactionType(createTransactionDto, itemsToProcess);

    // Calculate total price from items if not provided
    let calculatedTotalPrice = createTransactionDto.totalPrice;
    if (!calculatedTotalPrice) {
      calculatedTotalPrice = itemsToProcess.reduce((sum, item) => {
        const itemTotal =
          item.totalPrice ||
          (item.unitPrice ? item.unitPrice * item.quantity : 0);
        return sum + itemTotal;
      }, 0);
    }

    // Execute transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the main transaction
      const transaction = await tx.warehouseTransaction.create({
        data: {
          type: createTransactionDto.type,
          fromWarehouseId: createTransactionDto.fromWarehouseId,
          toWarehouseId: createTransactionDto.toWarehouseId,
          totalPrice: calculatedTotalPrice,
          note: createTransactionDto.note,
          partyName: createTransactionDto.partyName,
          referenceNumber: createTransactionDto.referenceNumber,
          userId: createTransactionDto.userId,
          salesInvoiceId: createTransactionDto.salesInvoiceId,
          purchaseInvoiceId: createTransactionDto.purchaseInvoiceId,
        },
      });

      // Create transaction items
      for (const item of itemsToProcess) {
        const itemTotalPrice =
          item.totalPrice ||
          (item.unitPrice ? item.unitPrice * item.quantity : 0);

        await tx.warehouseTransactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: item.productId,
            quantity: item.quantity,
            trackingId: item.trackingId,
            unitId: item.unitId,
            unitPrice: item.unitPrice,
            totalPrice: itemTotalPrice,
            itemNote: item.itemNote,
            originalSalesInvoiceItemId: item.originalSalesInvoiceItemId,
            originalPurchaseInvoiceItemId: item.originalPurchaseInvoiceItemId,
          },
        });

        // Update stock for this item
        await this.updateStockQuantitiesForItem(tx, createTransactionDto, item);
      }

      // Fetch complete transaction with items
      return await tx.warehouseTransaction.findUnique({
        where: { id: transaction.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  salesUnit: true,
                  purchaseUnit: true,
                },
              },
              unit: true,
              tracking: {
                include: {
                  storageUnit: true,
                },
              },
              originalSalesInvoiceItem: {
                include: {
                  product: true,
                  unit: true,
                },
              },
              originalPurchaseInvoiceItem: {
                include: {
                  product: true,
                  unit: true,
                },
              },
            },
          },
          fromWarehouse: true,
          toWarehouse: true,
          salesInvoice: {
            include: {
              client: true,
            },
          },
          purchaseInvoice: {
            include: {
              supplier: true,
            },
          },
          user: {
            select: {
              id: true,
              // username: true, // Removed: field does not exist
              name: true, // Using name field instead of firstName/lastName
              email: true,
            },
          },
        },
      });
    });

    return this.transformTransaction(result);
  }

  // Get all return transactions for a specific invoice
  async getReturnsByInvoice(
    invoiceType: 'sales' | 'purchase',
    invoiceId: number,
  ) {
    const where: any = {
      type: WarehouseTransactionType.RETURN,
    };

    if (invoiceType === 'sales') {
      where.salesInvoiceId = invoiceId;
    } else {
      where.purchaseInvoiceId = invoiceId;
    }

    return this.prisma.warehouseTransaction.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              include: {
                salesUnit: true,
                purchaseUnit: true,
              },
            },
            unit: true,
            tracking: {
              include: {
                storageUnit: true,
              },
            },
            originalSalesInvoiceItem: {
              include: {
                product: true,
                unit: true,
              },
            },
            originalPurchaseInvoiceItem: {
              include: {
                product: true,
                unit: true,
              },
            },
          },
        },
        fromWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
        toWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
        salesInvoice: {
          include: {
            client: true,
          },
        },
        purchaseInvoice: {
          include: {
            supplier: true,
          },
        },
        user: {
          select: {
            id: true,
            // username: true, // Removed: field does not exist
            name: true, // Using name field instead of firstName/lastName
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get all returns in the system
  async getAllReturns(query: WarehouseTransactionQueryDto) {
    return this.findAll({
      ...query,
      type: WarehouseTransactionType.RETURN,
    });
  }

  async findAll(query: WarehouseTransactionQueryDto) {
    const {
      search,
      type,
      productId,
      fromWarehouseId,
      toWarehouseId,
      warehouseId,
      // departmentId, // Removed: field does not exist
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page = 1,
      limit = 10,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        {
          items: {
            some: {
              product: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
        {
          items: {
            some: {
              product: {
                barcode: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
        { note: { contains: search, mode: 'insensitive' } },
        { fromWarehouse: { name: { contains: search, mode: 'insensitive' } } },
        { toWarehouse: { name: { contains: search, mode: 'insensitive' } } },
        { partyName: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (productId) {
      where.items = {
        some: {
          productId: productId,
        },
      };
    }

    if (fromWarehouseId) {
      where.fromWarehouseId = fromWarehouseId;
    }

    if (toWarehouseId) {
      where.toWarehouseId = toWarehouseId;
    }

    if (warehouseId) {
      where.OR = [
        { fromWarehouseId: warehouseId },
        { toWarehouseId: warehouseId },
      ];
    }

    // Department filtering removed as departments are not in current schema
    // if (departmentId) {
    //   where.OR = [
    //     { fromWarehouse: { departmentId: departmentId } },
    //     { toWarehouse: { departmentId: departmentId } },
    //   ];
    // }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.totalPrice = {};
      if (minAmount !== undefined) {
        where.totalPrice.gte = minAmount;
      }
      if (maxAmount !== undefined) {
        where.totalPrice.lte = maxAmount;
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.warehouseTransaction.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  salesUnit: true,
                  purchaseUnit: true,
                },
              },
              unit: true,
              tracking: {
                include: {
                  storageUnit: true,
                },
              },
            },
          },
          fromWarehouse: true,
          toWarehouse: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warehouseTransaction.count({ where }),
    ]);

    return {
      data: transactions.map((transaction) =>
        this.transformTransaction(transaction),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<WarehouseTransaction> {
    const transaction = await this.prisma.warehouseTransaction.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                salesUnit: true,
                purchaseUnit: true,
              },
            },
            unit: true,
            tracking: {
              include: {
                storageUnit: true,
              },
            },
          },
        },
        fromWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
        toWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('المعاملة غير موجودة');
    }

    return this.transformTransaction(transaction);
  }

  async update(
    id: number,
    updateTransactionDto: UpdateWarehouseTransactionDto,
  ): Promise<WarehouseTransaction> {
    const transaction = await this.prisma.warehouseTransaction.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                salesUnit: true,
                purchaseUnit: true,
              },
            },
            unit: true,
            tracking: {
              include: {
                storageUnit: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('المعاملة غير موجودة');
    }

    // For now, we'll support only basic updates to transaction metadata
    // Full item management would require a more complex API
    const allowedUpdates = {
      note: updateTransactionDto.note,
      partyName: updateTransactionDto.partyName,
      referenceNumber: updateTransactionDto.referenceNumber,
    };

    // Remove undefined values
    const updateData = Object.fromEntries(
      Object.entries(allowedUpdates).filter(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, value]) => value !== undefined,
      ),
    );

    const updatedTransaction = await this.prisma.warehouseTransaction.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              include: {
                salesUnit: true,
                purchaseUnit: true,
              },
            },
            unit: true,
            tracking: {
              include: {
                storageUnit: true,
              },
            },
          },
        },
        fromWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
        toWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
      },
    });

    return this.transformTransaction(updatedTransaction);
  }

  async remove(id: number): Promise<void> {
    const transaction = await this.prisma.warehouseTransaction.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('المعاملة غير موجودة');
    }

    // حذف المعاملة مع عكس تأثيرها على المخزون
    await this.prisma.$transaction(async (tx) => {
      // عكس تأثير المعاملة على المخزون لكل صنف
      for (const item of transaction.items) {
        await this.reverseStockQuantitiesForItem(tx, transaction, item);
      }

      // حذف المعاملة (سيتم حذف الأصناف تلقائياً بسبب onDelete: Cascade)
      await tx.warehouseTransaction.delete({
        where: { id },
      });
    });
  }

  async getTransactionStats() {
    const [totalTransactions, totalValue, transactionsByType] =
      await Promise.all([
        this.prisma.warehouseTransaction.count(),
        this.prisma.warehouseTransaction.aggregate({
          _sum: { totalPrice: true },
        }),
        this.prisma.warehouseTransaction.groupBy({
          by: ['type'],
          _count: { type: true },
          _sum: { totalPrice: true },
        }),
      ]);

    return {
      totalTransactions,
      totalValue: totalValue._sum.totalPrice || 0,
      transactionsByType: transactionsByType.map((item) => ({
        type: item.type,
        count: item._count.type,
        totalValue: item._sum.totalPrice || 0,
      })),
    };
  }

  async getProductTransactionHistory(productId: number, limit: number = 10) {
    const transactions = await this.prisma.warehouseTransaction.findMany({
      where: {
        items: {
          some: {
            productId: productId,
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                salesUnit: true,
                purchaseUnit: true,
              },
            },
            unit: true,
            tracking: {
              include: {
                storageUnit: true,
              },
            },
          },
        },
        fromWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
        toWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((transaction) =>
      this.transformTransaction(transaction),
    );
  }

  async getWarehouseTransactionHistory(
    warehouseId: number,
    limit: number = 10,
  ) {
    const transactions = await this.prisma.warehouseTransaction.findMany({
      where: {
        OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                salesUnit: true,
                purchaseUnit: true,
              },
            },
            unit: true,
            tracking: {
              include: {
                storageUnit: true,
              },
            },
          },
        },
        fromWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
        toWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((transaction) =>
      this.transformTransaction(transaction),
    );
  }

  async getDailyTransactions(date: string) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const transactions = await this.prisma.warehouseTransaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                salesUnit: true,
                purchaseUnit: true,
              },
            },
            unit: true,
            tracking: {
              include: {
                storageUnit: true,
              },
            },
          },
        },
        fromWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
        toWarehouse: {
          include: {
            // department: true, // Removed: field does not exist
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((transaction) =>
      this.transformTransaction(transaction),
    );
  }

  // دالة لتحويل الكمية إلى الوحدة الأساسية
  private convertToBaseUnit(quantity: number, unit: any): number {
    if (!unit) return quantity;

    const ratio = Number(unit.ratio);
    const unitType = unit.type;

    if (unitType === 'MAIN') {
      return quantity * 1;
    } else if (unitType === 'BIGGER') {
      return quantity * ratio;
    } else if (unitType === 'SMALLER') {
      return quantity / ratio;
    } else {
      return quantity;
    }
  }

  // دالة لتحويل الكمية بين وحدتين
  private convertQuantityBetweenUnits(
    quantity: number,
    fromUnit: any,
    toUnit: any,
  ): number {
    // إذا كانت الوحدتان نفسهما، لا حاجة للتحويل
    if (fromUnit?.id === toUnit?.id) {
      return quantity;
    }

    // إذا كانت إحدى الوحدتين غير موجودة، ارجع الكمية كما هي
    if (!fromUnit || !toUnit) {
      return quantity;
    }

    // تحويل من الوحدة الأولى إلى الوحدة الأساسية
    const quantityInBaseUnit = this.convertToBaseUnit(quantity, fromUnit);

    // تحويل من الوحدة الأساسية إلى الوحدة الثانية
    const result = this.convertFromBaseUnit(quantityInBaseUnit, toUnit);

    console.log(
      `Unit conversion: ${quantity} ${fromUnit?.name} -> ${result} ${toUnit?.name}`,
    );

    return result;
  }

  // دالة لتحويل الكمية من الوحدة الأساسية
  private convertFromBaseUnit(quantity: number, unit: any): number {
    if (!unit) return quantity;

    const ratio = Number(unit.ratio);
    const unitType = unit.type;

    if (unitType === 'MAIN') {
      return quantity * 1;
    } else if (unitType === 'BIGGER') {
      return quantity / ratio;
    } else if (unitType === 'SMALLER') {
      return quantity * ratio;
    } else {
      return quantity;
    }
  }

  // دالة للتحقق من الكمية المتاحة في التتبع
  private async validateTrackingQuantity(
    productId: number,
    warehouseId: number,
    quantity: number,
    trackingId?: number,
    unitId?: number,
  ): Promise<void> {
    // إذا لم يتم تحديد الوحدة، نحاول الحصول على الوحدة الافتراضية للمنتج
    if (!unitId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { salesUnit: true, purchaseUnit: true },
      });

      if (product) {
        // استخدام وحدة البيع أولاً، ثم وحدة الشراء
        unitId = product.salesUnitId || product.purchaseUnitId || undefined;
      }
    }
    const stock = await this.prisma.stock.findFirst({
      where: { productId, warehouseId },
      include: {
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
    });

    if (!stock) {
      throw new BadRequestException(`لا يوجد مخزون للمنتج في المخزن المحدد`);
    }

    // الحصول على الوحدة المستخدمة في الحركة
    let transactionUnit: any = null;
    if (unitId) {
      transactionUnit = await this.prisma.unit.findUnique({
        where: { id: unitId },
      });
      if (!transactionUnit) {
        throw new BadRequestException(`الوحدة المحددة غير موجودة`);
      }
    }

    if (trackingId) {
      // التحقق من تتبع محدد
      const tracking = stock.trackings.find((t) => t.id === trackingId);
      if (!tracking) {
        throw new BadRequestException(`التتبع المحدد غير موجود أو غير نشط`);
      }

      // Debug: Log all unit information
      console.log(`=== TRACKING UNIT DEBUG ===`);
      console.log(`Tracking ID: ${trackingId}`);
      console.log(`Tracking quantity: ${tracking.quantity}`);
      console.log(`Tracking storageUnitId: ${tracking.storageUnitId}`);
      console.log(
        `Tracking storageUnit:`,
        tracking.storageUnit
          ? {
              id: tracking.storageUnit.id,
              name: tracking.storageUnit.name,
              type: tracking.storageUnit.type,
              ratio: tracking.storageUnit.ratio,
            }
          : 'null',
      );
      console.log(`Transaction unitId: ${unitId}`);
      console.log(
        `Transaction unit:`,
        transactionUnit
          ? {
              id: transactionUnit.id,
              name: transactionUnit.name,
              type: transactionUnit.type,
              ratio: transactionUnit.ratio,
            }
          : 'null',
      );

      // تحويل الكمية المطلوبة إلى وحدة التتبع
      let requiredQuantityInTrackingUnit = quantity;
      let targetUnitName = transactionUnit?.name || 'وحدة';

      if (
        unitId &&
        tracking.storageUnit &&
        transactionUnit &&
        tracking.storageUnit.id !== transactionUnit.id
      ) {
        // التتبع له وحدة تخزين محددة مختلفة عن وحدة المعاملة
        console.log(
          `Converting ${quantity} ${transactionUnit.name} to ${tracking.storageUnit.name} for tracking validation`,
        );
        requiredQuantityInTrackingUnit = this.convertQuantityBetweenUnits(
          quantity,
          transactionUnit,
          tracking.storageUnit,
        );
        targetUnitName = tracking.storageUnit.name;
        console.log(
          `Converted quantity: ${requiredQuantityInTrackingUnit} ${targetUnitName}`,
        );
      } else {
        // إما أن التتبع ليس له وحدة تخزين محددة، أو الوحدة نفسها
        // في هذه الحالة، نفترض أن الكمية المخزنة بنفس وحدة المعاملة
        console.log(
          `No conversion needed - assuming tracking quantity is in ${targetUnitName}`,
        );
      }

      const availableQuantity = Number(tracking.quantity);
      console.log(
        `Tracking validation: ${availableQuantity} ${targetUnitName} available vs ${requiredQuantityInTrackingUnit} ${targetUnitName} required`,
      );

      if (availableQuantity < requiredQuantityInTrackingUnit) {
        if (requiredQuantityInTrackingUnit !== quantity) {
          // حدث تحويل وحدة
          throw new BadRequestException(
            `الكمية المتاحة في التتبع المحدد (${availableQuantity} ${targetUnitName}) أقل من المطلوب (${quantity} ${transactionUnit?.name || 'وحدة'} = ${requiredQuantityInTrackingUnit.toFixed(3)} ${targetUnitName})`,
          );
        } else {
          // لم يحدث تحويل وحدة
          throw new BadRequestException(
            `الكمية المتاحة في التتبع المحدد (${availableQuantity} ${targetUnitName}) أقل من المطلوب (${quantity} ${targetUnitName})`,
          );
        }
      }
    } else {
      // التحقق من إجمالي الكمية المتاحة
      const totalAvailableQuantity = stock.trackings.reduce((sum, tracking) => {
        if (!tracking.storageUnit) {
          return sum + Number(tracking.quantity);
        }

        const ratio = Number(tracking.storageUnit.ratio);
        const unitType = tracking.storageUnit.type;

        if (unitType === 'MAIN') {
          return sum + Number(tracking.quantity) * 1;
        } else if (unitType === 'BIGGER') {
          return sum + Number(tracking.quantity) * ratio;
        } else if (unitType === 'SMALLER') {
          return sum + Number(tracking.quantity) / ratio;
        } else {
          return sum + Number(tracking.quantity);
        }
      }, 0);

      // إذا كانت الحركة بوحدة مختلفة، نحول الكمية المطلوبة إلى الوحدة الأساسية
      let requiredQuantityInBaseUnit = quantity;
      if (unitId) {
        requiredQuantityInBaseUnit = this.convertToBaseUnit(
          quantity,
          transactionUnit!,
        );
      }

      if (totalAvailableQuantity < requiredQuantityInBaseUnit) {
        throw new BadRequestException(
          `الكمية المتاحة (${totalAvailableQuantity.toFixed(3)} وحدة أساسية) أقل من المطلوب (${requiredQuantityInBaseUnit.toFixed(3)} وحدة أساسية)`,
        );
      }
    }
  }

  private async validateTransactionType(
    transaction: CreateWarehouseTransactionDto,
    items?: WarehouseTransactionItemDto[],
  ): Promise<void> {
    // Simple global warehouse validation for all transaction types
    switch (transaction.type) {
      case WarehouseTransactionType.PURCHASE:
        if (!transaction.toWarehouseId) {
          throw new BadRequestException('معاملة الشراء تتطلب مخزن الهدف');
        }
        break;

      case WarehouseTransactionType.ADD:
        if (!transaction.toWarehouseId) {
          throw new BadRequestException('معاملة الإضافة تتطلب مخزن الهدف');
        }
        break;

      case WarehouseTransactionType.SALE:
        if (!transaction.fromWarehouseId) {
          throw new BadRequestException('معاملة البيع تتطلب مخزن المصدر');
        }
        // التحقق من الكمية المتاحة للبيع
        if (items) {
          for (const item of items) {
            await this.validateTrackingQuantity(
              item.productId,
              transaction.fromWarehouseId,
              item.quantity,
              item.trackingId,
              item.unitId,
            );
          }
        }
        break;

      case WarehouseTransactionType.TRANSFER:
        if (!transaction.fromWarehouseId || !transaction.toWarehouseId) {
          throw new BadRequestException(
            'معاملة النقل تتطلب مخزن المصدر والهدف',
          );
        }
        if (transaction.fromWarehouseId === transaction.toWarehouseId) {
          throw new BadRequestException('لا يمكن نقل المخزون لنفس المخزن');
        }
        // التحقق من الكمية المتاحة للنقل
        if (items) {
          for (const item of items) {
            await this.validateTrackingQuantity(
              item.productId,
              transaction.fromWarehouseId,
              item.quantity,
              item.trackingId,
              item.unitId,
            );
          }
        }
        break;

      case WarehouseTransactionType.ADJUST:
        if (!transaction.toWarehouseId) {
          throw new BadRequestException('معاملة التعديل تتطلب مخزن الهدف');
        }
        break;

      case WarehouseTransactionType.DISPENSE:
        if (!transaction.fromWarehouseId) {
          throw new BadRequestException('معاملة الصرف تتطلب مخزن المصدر');
        }
        // التحقق من الكمية المتاحة للصرف
        if (items) {
          for (const item of items) {
            await this.validateTrackingQuantity(
              item.productId,
              transaction.fromWarehouseId,
              item.quantity,
              item.trackingId,
              item.unitId,
            );
          }
        }
        break;

      case WarehouseTransactionType.DAMAGE:
        if (!transaction.fromWarehouseId) {
          throw new BadRequestException('معاملة الإتلاف تتطلب مخزن المصدر');
        }
        // التحقق من الكمية المتاحة للإتلاف
        if (items) {
          for (const item of items) {
            await this.validateTrackingQuantity(
              item.productId,
              transaction.fromWarehouseId,
              item.quantity,
              item.trackingId,
              item.unitId,
            );
          }
        }
        break;

      case WarehouseTransactionType.RETURN:
        // إرجاع أصناف - validation handled by individual items with their warehouse IDs
        // For return transactions, each item can specify its own warehouse (fromWarehouseId/toWarehouseId)
        // No global warehouse validation needed as it's handled per item
        break;

      default:
        throw new BadRequestException('نوع المعاملة غير صحيح');
    }
  }

  private async updateStockQuantitiesForItem(
    tx: any,
    transaction: CreateWarehouseTransactionDto,
    item: WarehouseTransactionItemDto,
  ): Promise<void> {
    const { type, fromWarehouseId, toWarehouseId } = transaction;
    const { productId, quantity, trackingId, unitId, newTracking } = item;

    switch (type) {
      case WarehouseTransactionType.PURCHASE:
        // الشراء: زيادة المخزون في المخزن الهدف
        if (!toWarehouseId) {
          throw new BadRequestException(
            `معاملة الشراء تتطلب مخزن الهدف للمنتج ${productId}`,
          );
        }
        await this.increaseStock(
          tx,
          productId,
          toWarehouseId,
          quantity,
          trackingId,
          unitId,
          newTracking,
        );
        break;

      case WarehouseTransactionType.ADD:
        // الإضافة: زيادة المخزون في المخزن الهدف
        if (!toWarehouseId) {
          throw new BadRequestException(
            `معاملة الإضافة تتطلب مخزن الهدف للمنتج ${productId}`,
          );
        }
        await this.increaseStock(
          tx,
          productId,
          toWarehouseId,
          quantity,
          trackingId,
          unitId,
          newTracking,
        );
        break;

      case WarehouseTransactionType.SALE:
      case WarehouseTransactionType.DISPENSE:
      case WarehouseTransactionType.DAMAGE:
        // البيع/الصرف/الإتلاف: تقليل المخزون من المخزن المصدر
        if (!fromWarehouseId) {
          throw new BadRequestException(
            `معاملة ${type} تتطلب مخزن المصدر للمنتج ${productId}`,
          );
        }
        await this.decreaseStock(
          tx,
          productId,
          fromWarehouseId,
          quantity,
          trackingId,
          unitId,
        );
        break;

      case WarehouseTransactionType.TRANSFER:
        // النقل: تقليل من المصدر وزيادة في الهدف مع الحفاظ على التتبع
        if (!fromWarehouseId || !toWarehouseId) {
          throw new BadRequestException(
            `معاملة النقل تتطلب مخزن المصدر والهدف للمنتج ${productId}`,
          );
        }

        // الحصول على بيانات التتبع الأصلي للحفاظ عليه في المخزن الهدف
        const sourceTrackingData = await this.getTrackingDataForTransfer(
          tx,
          productId,
          fromWarehouseId,
          trackingId,
        );

        // تقليل من المخزن المصدر مع التتبع المحدد
        await this.decreaseStock(
          tx,
          productId,
          fromWarehouseId,
          quantity,
          trackingId,
          unitId,
        );

        // زيادة في المخزن الهدف مع نفس بيانات التتبع أو دمجها مع التتبع الموجود
        await this.increaseStockWithTrackingPreservation(
          tx,
          productId,
          toWarehouseId,
          quantity,
          unitId,
          sourceTrackingData,
        );
        break;

      case WarehouseTransactionType.ADJUST:
        // التعديل: زيادة في المخزن الهدف (يمكن أن تكون سالبة للتقليل)
        if (!toWarehouseId) {
          throw new BadRequestException(
            `معاملة التعديل تتطلب مخزن الهدف للمنتج ${productId}`,
          );
        }
        await this.increaseStock(
          tx,
          productId,
          toWarehouseId,
          quantity,
          trackingId,
          unitId,
          newTracking,
        );
        break;

      case WarehouseTransactionType.RETURN:
        // الإرجاع: يعتمد على نوع الإرجاع مع الحفاظ على التتبع الأصلي
        // إرجاع شراء: تقليل المخزون من المخزن (إرجاع للمورد)
        // إرجاع بيع: زيادة المخزون في المخزن (إرجاع من العميل) مع نفس التتبع الأصلي

        if (item.fromWarehouseId) {
          // Purchase return: decrease stock from warehouse (returning TO supplier)
          await this.decreaseStock(
            tx,
            productId,
            item.fromWarehouseId,
            quantity,
            trackingId,
            unitId,
          );
        } else if (item.toWarehouseId) {
          // Sales return: increase stock in warehouse (returning FROM customer)
          // الحصول على بيانات التتبع الأصلي من فاتورة البيع الأصلية
          const originalTrackingData =
            await this.getOriginalTrackingDataForReturn(tx, item);
          await this.increaseStockWithTrackingPreservation(
            tx,
            productId,
            item.toWarehouseId,
            quantity,
            unitId,
            originalTrackingData,
          );
        } else {
          // Fallback to transaction-level warehouse IDs
          const returnFromWarehouseId = fromWarehouseId;
          const returnToWarehouseId = toWarehouseId;

          if (returnFromWarehouseId) {
            // Purchase return
            await this.decreaseStock(
              tx,
              productId,
              returnFromWarehouseId,
              quantity,
              trackingId,
              unitId,
            );
          } else if (returnToWarehouseId) {
            // Sales return
            const originalTrackingData =
              await this.getOriginalTrackingDataForReturn(tx, item);
            await this.increaseStockWithTrackingPreservation(
              tx,
              productId,
              returnToWarehouseId,
              quantity,
              unitId,
              originalTrackingData,
            );
          } else {
            throw new BadRequestException(
              `معاملة الإرجاع تتطلب تحديد مخزن للمنتج ${productId}`,
            );
          }
        }
        break;

      default:
        throw new BadRequestException('نوع المعاملة غير مدعوم');
    }
  }

  // Keep old method for backward compatibility
  private async updateStockQuantities(
    tx: any,
    transaction: CreateWarehouseTransactionDto,
  ): Promise<void> {
    const { type, productId, fromWarehouseId, toWarehouseId, quantity } =
      transaction;

    if (!productId || !quantity) {
      throw new BadRequestException('يجب تحديد معرف المنتج والكمية');
    }

    switch (type) {
      case WarehouseTransactionType.PURCHASE:
        // الشراء: زيادة المخزون في المخزن الهدف
        await this.increaseStock(tx, productId, toWarehouseId!, quantity);
        break;

      case WarehouseTransactionType.SALE:
      case WarehouseTransactionType.DISPENSE:
      case WarehouseTransactionType.DAMAGE:
        // البيع/الصرف/الإتلاف: تقليل المخزون من المخزن المصدر
        await this.decreaseStock(tx, productId, fromWarehouseId!, quantity);
        break;

      case WarehouseTransactionType.TRANSFER:
        // النقل: تقليل من المصدر وزيادة في الهدف
        await this.decreaseStock(tx, productId, fromWarehouseId!, quantity);
        await this.increaseStock(tx, productId, toWarehouseId!, quantity);
        break;

      case WarehouseTransactionType.ADJUST:
        // التعديل: زيادة في المخزن الهدف (يمكن أن تكون سالبة للتقليل)
        await this.increaseStock(tx, productId, toWarehouseId!, quantity);
        break;

      default:
        throw new BadRequestException('نوع المعاملة غير مدعوم');
    }
  }

  private async increaseStock(
    tx: any,
    productId: number,
    warehouseId: number,
    quantity: number,
    trackingId?: number,
    unitId?: number,
    newTrackingData?: any,
  ): Promise<void> {
    console.log(`=== INCREASE STOCK DEBUG ===`);
    console.log(
      `Product ID: ${productId}, Warehouse ID: ${warehouseId}, Quantity: ${quantity}`,
    );
    console.log(`Tracking ID: ${trackingId}, Unit ID: ${unitId}`);

    // إذا لم يتم تحديد الوحدة، نحاول الحصول على الوحدة الافتراضية للمنتج
    if (!unitId) {
      console.log(`No unitId provided, looking for product default units...`);
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { salesUnit: true, purchaseUnit: true },
      });

      if (product) {
        // استخدام وحدة البيع أولاً، ثم وحدة الشراء
        unitId = product.salesUnitId || product.purchaseUnitId || undefined;
        console.log(
          `Found default unitId: ${unitId} (from ${product.salesUnitId ? 'salesUnit' : 'purchaseUnit'})`,
        );
      }
    } else {
      console.log(`Using provided unitId: ${unitId}`);
    }
    // البحث عن المخزون الحالي
    const existingStock = await tx.stock.findFirst({
      where: { productId, warehouseId },
      include: {
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
    });

    if (existingStock) {
      if (trackingId) {
        // تحديث تتبع محدد
        const tracking = await tx.tracking.findFirst({
          where: {
            id: trackingId,
            stockId: existingStock.id,
            isActive: true,
            isDeleted: false,
          },
          include: { storageUnit: true },
        });

        if (!tracking) {
          throw new BadRequestException(`التتبع المحدد غير موجود أو غير نشط`);
        }

        // تحويل الكمية الجديدة إلى وحدة التتبع قبل الإضافة
        let quantityToAdd = quantity;
        if (
          unitId &&
          tracking.storageUnit &&
          tracking.storageUnit.id !== unitId
        ) {
          // الحصول على وحدة المعاملة
          const transactionUnit = await tx.unit.findUnique({
            where: { id: unitId },
          });

          if (transactionUnit) {
            console.log(
              `Converting ${quantity} ${transactionUnit.name} to ${tracking.storageUnit.name} before adding to existing tracking`,
            );
            quantityToAdd = this.convertQuantityBetweenUnits(
              quantity,
              transactionUnit,
              tracking.storageUnit,
            );
            console.log(
              `Converted quantity: ${quantityToAdd} ${tracking.storageUnit.name}`,
            );
          }
        }

        const newQuantity = Number(tracking.quantity) + quantityToAdd;
        console.log(
          `Updating tracking ${trackingId}: ${tracking.quantity} + ${quantityToAdd} = ${newQuantity}`,
        );

        await tx.tracking.update({
          where: { id: trackingId },
          data: {
            quantity: newQuantity,
            updatedAt: new Date(),
          },
        });
      } else {
        // إنشاء تتبع جديد (مع دعم البيانات المخصصة)
        console.log(
          `Creating new tracking for existing stock: stockId=${existingStock.id}, quantity=${quantity}, storageUnitId=${unitId}`,
        );
        console.log(`New tracking data:`, newTrackingData);

        const trackingData: any = {
          stockId: existingStock.id,
          trackingType: newTrackingData?.trackingType || 'NONE',
          quantity,
          storageUnitId: newTrackingData?.storageUnitId || unitId,
        };

        // إضافة بيانات التتبع المخصصة حسب النوع
        if (newTrackingData) {
          if (newTrackingData.lotNumber)
            trackingData.lotNumber = newTrackingData.lotNumber;
          if (newTrackingData.serialNumber)
            trackingData.serialNumber = newTrackingData.serialNumber;
          if (newTrackingData.batchName)
            trackingData.batchName = newTrackingData.batchName;
          if (newTrackingData.productionDate)
            trackingData.productionDate = new Date(
              newTrackingData.productionDate,
            );
          if (newTrackingData.expiryDate)
            trackingData.expiryDate = new Date(newTrackingData.expiryDate);
          if (newTrackingData.supplierName)
            trackingData.supplierName = newTrackingData.supplierName;
          if (newTrackingData.notes) trackingData.notes = newTrackingData.notes;
        }

        await tx.tracking.create({ data: trackingData });
        console.log(
          `Created ${trackingData.trackingType} tracking with data:`,
          trackingData,
        );
      }

      // تحديث تاريخ آخر تحديث للمخزون
      await tx.stock.update({
        where: { id: existingStock.id },
        data: {
          lastUpdated: new Date(),
        },
      });
    } else {
      // إنشاء مخزون جديد مع تتبع
      const newStock = await tx.stock.create({
        data: {
          productId,
          warehouseId,
          lastUpdated: new Date(),
        },
      });

      if (trackingId) {
        throw new BadRequestException(`لا يمكن استخدام تتبع محدد لمخزون جديد`);
      }

      // إنشاء تتبع جديد (مع دعم البيانات المخصصة)
      console.log(
        `Creating new tracking for new stock: stockId=${newStock.id}, quantity=${quantity}, storageUnitId=${unitId}`,
      );
      console.log(`New tracking data:`, newTrackingData);

      const trackingData: any = {
        stockId: newStock.id,
        trackingType: newTrackingData?.trackingType || 'NONE',
        quantity,
        storageUnitId: newTrackingData?.storageUnitId || unitId,
      };

      // إضافة بيانات التتبع المخصصة حسب النوع
      if (newTrackingData) {
        if (newTrackingData.lotNumber)
          trackingData.lotNumber = newTrackingData.lotNumber;
        if (newTrackingData.serialNumber)
          trackingData.serialNumber = newTrackingData.serialNumber;
        if (newTrackingData.batchName)
          trackingData.batchName = newTrackingData.batchName;
        if (newTrackingData.productionDate)
          trackingData.productionDate = new Date(
            newTrackingData.productionDate,
          );
        if (newTrackingData.expiryDate)
          trackingData.expiryDate = new Date(newTrackingData.expiryDate);
        if (newTrackingData.supplierName)
          trackingData.supplierName = newTrackingData.supplierName;
        if (newTrackingData.notes) trackingData.notes = newTrackingData.notes;
      }

      await tx.tracking.create({ data: trackingData });
      console.log(
        `Created ${trackingData.trackingType} tracking with data:`,
        trackingData,
      );
    }
  }

  private async decreaseStock(
    tx: any,
    productId: number,
    warehouseId: number,
    quantity: number,
    trackingId?: number,
    unitId?: number,
  ): Promise<void> {
    // إذا لم يتم تحديد الوحدة، نحاول الحصول على الوحدة الافتراضية للمنتج
    if (!unitId) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { salesUnit: true, purchaseUnit: true },
      });

      if (product) {
        // استخدام وحدة البيع أولاً، ثم وحدة الشراء
        unitId = product.salesUnitId || product.purchaseUnitId || undefined;
      }
    }
    // البحث عن المخزون الحالي
    const existingStock = await tx.stock.findFirst({
      where: { productId, warehouseId },
      include: {
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
    });

    if (!existingStock) {
      throw new BadRequestException(`لا يوجد مخزون للمنتج في المخزن المحدد`);
    }

    if (trackingId) {
      // تقليل من تتبع محدد
      const tracking = await tx.tracking.findFirst({
        where: {
          id: trackingId,
          stockId: existingStock.id,
          isActive: true,
          isDeleted: false,
        },
        include: { storageUnit: true },
      });

      if (!tracking) {
        throw new BadRequestException(`التتبع المحدد غير موجود أو غير نشط`);
      }

      // تحويل الكمية المطلوبة إلى وحدة التتبع
      let requiredQuantityInTrackingUnit = quantity;
      if (unitId && tracking.storageUnit) {
        const transactionUnit = await tx.unit.findUnique({
          where: { id: unitId },
        });
        if (transactionUnit) {
          requiredQuantityInTrackingUnit = this.convertQuantityBetweenUnits(
            quantity,
            transactionUnit,
            tracking.storageUnit,
          );
        }
      }

      const currentQuantity = Number(tracking.quantity);
      if (currentQuantity < requiredQuantityInTrackingUnit) {
        throw new BadRequestException(
          `الكمية المتاحة في التتبع المحدد (${currentQuantity} ${tracking.storageUnit?.name || 'وحدة'}) أقل من المطلوب (${requiredQuantityInTrackingUnit} ${tracking.storageUnit?.name || 'وحدة'})`,
        );
      }

      const newQuantity = currentQuantity - requiredQuantityInTrackingUnit;

      if (newQuantity === 0) {
        // إذا أصبحت الكمية صفر، نعطل التتبع
        await tx.tracking.update({
          where: { id: trackingId },
          data: {
            quantity: 0,
            isActive: false,
            updatedAt: new Date(),
          },
        });
      } else {
        // تحديث الكمية
        await tx.tracking.update({
          where: { id: trackingId },
          data: {
            quantity: newQuantity,
            updatedAt: new Date(),
          },
        });
      }
    } else {
      // تقليل من التتبع المتاح (FIFO - First In, First Out)
      const availableTrackings = existingStock.trackings.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      // تحويل الكمية المطلوبة إلى الوحدة الأساسية
      let requiredQuantityInBaseUnit = quantity;
      if (unitId) {
        const transactionUnit = await tx.unit.findUnique({
          where: { id: unitId },
        });
        if (transactionUnit) {
          requiredQuantityInBaseUnit = this.convertToBaseUnit(
            quantity,
            transactionUnit,
          );
        }
      }

      let remainingQuantity = requiredQuantityInBaseUnit;

      for (const tracking of availableTrackings) {
        if (remainingQuantity <= 0) break;

        const trackingQuantity = Number(tracking.quantity);
        if (trackingQuantity <= 0) continue;

        // تحويل كمية التتبع إلى الوحدة الأساسية
        let trackingQuantityInBaseUnit = trackingQuantity;
        if (tracking.storageUnit) {
          trackingQuantityInBaseUnit = this.convertToBaseUnit(
            trackingQuantity,
            tracking.storageUnit,
          );
        }

        const quantityToReduce = Math.min(
          remainingQuantity,
          trackingQuantityInBaseUnit,
        );

        // تحويل الكمية المطلوب تقليلها إلى وحدة التتبع
        let quantityToReduceInTrackingUnit = quantityToReduce;
        if (tracking.storageUnit) {
          quantityToReduceInTrackingUnit = this.convertFromBaseUnit(
            quantityToReduce,
            tracking.storageUnit,
          );
        }

        const newQuantity = trackingQuantity - quantityToReduceInTrackingUnit;

        if (newQuantity === 0) {
          // إذا أصبحت الكمية صفر، نعطل التتبع
          await tx.tracking.update({
            where: { id: tracking.id },
            data: {
              quantity: 0,
              isActive: false,
              updatedAt: new Date(),
            },
          });
        } else {
          // تحديث الكمية
          await tx.tracking.update({
            where: { id: tracking.id },
            data: {
              quantity: newQuantity,
              updatedAt: new Date(),
            },
          });
        }

        remainingQuantity -= quantityToReduce;
      }

      if (remainingQuantity > 0) {
        throw new BadRequestException(
          `الكمية المتاحة (${(requiredQuantityInBaseUnit - remainingQuantity).toFixed(3)} ${existingStock.baseUnit?.name || 'وحدة أساسية'}) أقل من المطلوب (${requiredQuantityInBaseUnit.toFixed(3)} ${existingStock.baseUnit?.name || 'وحدة أساسية'})`,
        );
      }
    }

    // تحديث تاريخ آخر تحديث للمخزون
    await tx.stock.update({
      where: { id: existingStock.id },
      data: {
        lastUpdated: new Date(),
      },
    });
  }

  private async reverseStockQuantitiesForItem(
    tx: any,
    transaction: any,
    item: any,
  ): Promise<void> {
    const { type, fromWarehouseId, toWarehouseId } = transaction;
    const { productId, quantity } = item;

    // عكس تأثير المعاملة الأصلية
    switch (type) {
      case WarehouseTransactionType.PURCHASE:
        // عكس الشراء: تقليل المخزون من المخزن الهدف
        await this.decreaseStockForReversal(
          tx,
          productId,
          toWarehouseId,
          Number(quantity),
        );
        break;

      case WarehouseTransactionType.SALE:
      case WarehouseTransactionType.DISPENSE:
      case WarehouseTransactionType.DAMAGE:
        // عكس البيع/الصرف/الإتلاف: زيادة المخزون في المخزن المصدر
        await this.increaseStock(
          tx,
          productId,
          fromWarehouseId,
          Number(quantity),
        );
        break;

      case WarehouseTransactionType.TRANSFER:
        // عكس النقل: زيادة في المصدر وتقليل من الهدف
        await this.increaseStock(
          tx,
          productId,
          fromWarehouseId,
          Number(quantity),
        );
        await this.decreaseStockForReversal(
          tx,
          productId,
          toWarehouseId,
          Number(quantity),
        );
        break;

      case WarehouseTransactionType.ADJUST:
        // عكس التعديل: تقليل من المخزن الهدف
        await this.decreaseStockForReversal(
          tx,
          productId,
          toWarehouseId,
          Number(quantity),
        );
        break;

      default:
        throw new BadRequestException('نوع المعاملة غير مدعوم');
    }
  }

  // Keep old method for backward compatibility
  private async reverseStockQuantities(
    tx: any,
    transaction: any,
  ): Promise<void> {
    const { type, productId, fromWarehouseId, toWarehouseId, quantity } =
      transaction;

    // عكس تأثير المعاملة الأصلية
    switch (type) {
      case WarehouseTransactionType.PURCHASE:
        // عكس الشراء: تقليل المخزون من المخزن الهدف
        await this.decreaseStockForReversal(
          tx,
          productId,
          toWarehouseId,
          Number(quantity),
        );
        break;

      case WarehouseTransactionType.SALE:
      case WarehouseTransactionType.DISPENSE:
      case WarehouseTransactionType.DAMAGE:
        // عكس البيع/الصرف/الإتلاف: زيادة المخزون في المخزن المصدر
        await this.increaseStock(
          tx,
          productId,
          fromWarehouseId,
          Number(quantity),
        );
        break;

      case WarehouseTransactionType.TRANSFER:
        // عكس النقل: زيادة في المصدر وتقليل من الهدف
        await this.increaseStock(
          tx,
          productId,
          fromWarehouseId,
          Number(quantity),
        );
        await this.decreaseStockForReversal(
          tx,
          productId,
          toWarehouseId,
          Number(quantity),
        );
        break;

      case WarehouseTransactionType.ADJUST:
        // عكس التعديل: تقليل من المخزن الهدف
        await this.decreaseStockForReversal(
          tx,
          productId,
          toWarehouseId,
          Number(quantity),
        );
        break;

      default:
        throw new BadRequestException('نوع المعاملة غير مدعوم');
    }
  }

  private async decreaseStockForReversal(
    tx: any,
    productId: number,
    warehouseId: number,
    quantity: number,
  ): Promise<void> {
    // البحث عن المخزون الحالي
    const existingStock = await tx.stock.findFirst({
      where: { productId, warehouseId },
    });

    if (!existingStock) {
      // إذا لم يكن هناك مخزون، لا يمكن عكس المعاملة
      throw new BadRequestException(
        `لا يمكن عكس المعاملة: لا يوجد مخزون للمنتج في المخزن المحدد`,
      );
    }

    const currentQuantity = Number(existingStock.quantity);
    const newQuantity = currentQuantity - quantity;

    if (newQuantity < 0) {
      // في حالة العكس، يُسمح بالكميات السالبة (قد تحدث في حالات التعديل)
      // ولكن سنحذر في السجلات
      console.warn(
        `تحذير: المخزون أصبح سالباً بعد عكس المعاملة. المخزن: ${warehouseId}, المنتج: ${productId}, الكمية الحالية: ${currentQuantity}, الكمية المطلوب تقليلها: ${quantity}`,
      );
    }

    await tx.stock.update({
      where: { id: existingStock.id },
      data: {
        quantity: newQuantity,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * الحصول على بيانات التتبع للنقل - للحفاظ على نفس التتبع في المخزن الهدف
   */
  private async getTrackingDataForTransfer(
    tx: any,
    productId: number,
    fromWarehouseId: number,
    trackingId?: number,
  ): Promise<any> {
    if (!trackingId) {
      // لا يوجد تتبع محدد - سيتم إنشاء تتبع جديد من نوع NONE
      return {
        trackingType: 'NONE',
        lotNumber: null,
        serialNumber: null,
        batchName: null,
        productionDate: null,
        expiryDate: null,
        supplierName: null,
        notes: null,
      };
    }

    // البحث عن بيانات التتبع الأصلي
    const sourceStock = await tx.stock.findFirst({
      where: { productId, warehouseId: fromWarehouseId },
      include: {
        trackings: {
          where: {
            id: trackingId,
            isActive: true,
            isDeleted: false,
          },
          include: { storageUnit: true },
        },
      },
    });

    if (!sourceStock) {
      throw new BadRequestException(`لا يوجد مخزون للمنتج في المخزن المصدر`);
    }

    const sourceTracking = sourceStock.trackings[0];
    if (!sourceTracking) {
      throw new BadRequestException(`التتبع المحدد غير موجود في المخزن المصدر`);
    }

    // إرجاع نسخة من بيانات التتبع للاستخدام في المخزن الهدف
    return {
      trackingType: sourceTracking.trackingType,
      lotNumber: sourceTracking.lotNumber,
      serialNumber: sourceTracking.serialNumber,
      batchName: sourceTracking.batchName,
      productionDate: sourceTracking.productionDate,
      expiryDate: sourceTracking.expiryDate,
      supplierName: sourceTracking.supplierName,
      notes: sourceTracking.notes,
      storageUnitId: sourceTracking.storageUnitId,
    };
  }

  /**
   * الحصول على بيانات التتبع الأصلي للإرجاع من فاتورة البيع الأصلية
   */
  private async getOriginalTrackingDataForReturn(
    tx: any,
    item: any,
  ): Promise<any> {
    if (
      !item.originalSalesInvoiceItemId &&
      !item.originalPurchaseInvoiceItemId
    ) {
      // لا يوجد ربط بفاتورة أصلية - سيتم إنشاء تتبع جديد من نوع NONE
      return {
        trackingType: 'NONE',
        lotNumber: null,
        serialNumber: null,
        batchName: null,
        productionDate: null,
        expiryDate: null,
        supplierName: null,
        notes: null,
      };
    }

    // البحث عن الصنف الأصلي في الفاتورة
    let originalItem = null;

    if (item.originalSalesInvoiceItemId) {
      originalItem = await tx.salesInvoiceItem.findUnique({
        where: { id: item.originalSalesInvoiceItemId },
        include: {
          product: true,
          unit: true,
        },
      });
    } else if (item.originalPurchaseInvoiceItemId) {
      originalItem = await tx.purchaseInvoiceItem.findUnique({
        where: { id: item.originalPurchaseInvoiceItemId },
        include: {
          product: true,
          unit: true,
        },
      });
    }

    if (!originalItem) {
      // لا يوجد صنف أصلي - سيتم إنشاء تتبع جديد
      return {
        trackingType: 'NONE',
        lotNumber: null,
        serialNumber: null,
        batchName: null,
        productionDate: null,
        expiryDate: null,
        supplierName: null,
        notes: null,
      };
    }

    // في المستقبل، يمكن تطوير هذا للبحث في سجل المعاملات الأصلية للحصول على بيانات التتبع
    // الآن سنستخدم نفس approach كما في النقل - تتبع من نوع NONE
    return {
      trackingType: 'NONE',
      lotNumber: null,
      serialNumber: null,
      batchName: null,
      productionDate: null,
      expiryDate: null,
      supplierName: null,
      notes: `إرجاع من فاتورة ${item.originalSalesInvoiceItemId ? 'بيع' : 'شراء'}`,
    };
  }

  /**
   * زيادة المخزون مع الحفاظ على التتبع أو دمجه مع التتبع الموجود
   */
  private async increaseStockWithTrackingPreservation(
    tx: any,
    productId: number,
    warehouseId: number,
    quantity: number,
    unitId?: number,
    trackingData?: any,
  ): Promise<void> {
    // Increase stock with tracking preservation logic

    // البحث عن المخزون الحالي
    const existingStock = await tx.stock.findFirst({
      where: { productId, warehouseId },
      include: {
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
    });

    if (existingStock && trackingData) {
      // البحث عن تتبع موجود بنفس المواصفات (batch, lot, serial)
      const matchingTracking = existingStock.trackings.find((tracking) => {
        return (
          tracking.trackingType === trackingData.trackingType &&
          tracking.lotNumber === trackingData.lotNumber &&
          tracking.serialNumber === trackingData.serialNumber &&
          tracking.batchName === trackingData.batchName &&
          tracking.storageUnitId === trackingData.storageUnitId
        );
      });

      if (matchingTracking) {
        // وجد تتبع مطابق - دمج الكميات

        // تحويل الكمية الجديدة إلى وحدة التتبع قبل الإضافة
        let quantityToAdd = quantity;
        if (
          unitId &&
          matchingTracking.storageUnit &&
          matchingTracking.storageUnit.id !== unitId
        ) {
          const transactionUnit = await tx.unit.findUnique({
            where: { id: unitId },
          });

          if (transactionUnit) {
            quantityToAdd = this.convertQuantityBetweenUnits(
              quantity,
              transactionUnit,
              matchingTracking.storageUnit,
            );
          }
        }

        const newQuantity = Number(matchingTracking.quantity) + quantityToAdd;

        await tx.tracking.update({
          where: { id: matchingTracking.id },
          data: {
            quantity: newQuantity,
            updatedAt: new Date(),
          },
        });

        // تحديث تاريخ آخر تحديث للمخزون
        await tx.stock.update({
          where: { id: existingStock.id },
          data: {
            lastUpdated: new Date(),
          },
        });

        return;
      }
    }

    // لم يتم العثور على تتبع مطابق - إنشاء تتبع جديد أو استخدام الطريقة العادية
    await this.increaseStock(
      tx,
      productId,
      warehouseId,
      quantity,
      undefined,
      unitId,
      trackingData,
    );
  }

  async createBulk(
    createTransactionDtos: CreateWarehouseTransactionDto[],
  ): Promise<{
    success: WarehouseTransaction[];
    failed: { transaction: CreateWarehouseTransactionDto; error: string }[];
  }> {
    const success: WarehouseTransaction[] = [];
    const failed: {
      transaction: CreateWarehouseTransactionDto;
      error: string;
    }[] = [];

    for (const dto of createTransactionDtos) {
      try {
        const transaction = await this.create(dto);
        success.push(transaction);
      } catch (error) {
        failed.push({
          transaction: dto,
          error: error.message || 'خطأ غير معروف',
        });
      }
    }

    return { success, failed };
  }
}
