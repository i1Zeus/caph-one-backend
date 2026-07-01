import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { AdjustmentType, StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Stock, StockStatus } from './entities/stock.entity';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  private async calculateStockQuantity(stockId: number): Promise<number> {
    const trackings = await this.tenantPrisma.client.tracking.findMany({
      where: {
        stockId,
        isActive: true,
        isDeleted: false,
      },
      include: {
        storageUnit: true,
      },
    });

    return trackings.reduce((sum, tracking) => {
      return (
        sum +
        this.convertToBaseUnit(Number(tracking.quantity), tracking.storageUnit)
      );
    }, 0);
  }

  // دالة مساعدة لتحويل الكمية إلى الوحدة الأساسية
  private convertToBaseUnit(quantity: number, storageUnit: any): number {
    if (!storageUnit) {
      return quantity;
    }

    const ratio = Number(storageUnit.ratio);
    const unitType = storageUnit.type;

    if (unitType === 'MAIN') {
      // الوحدة الأساسية
      return quantity * 1;
    } else if (unitType === 'BIGGER') {
      // وحدة أكبر (مثل كيلومتر بالنسبة للمتر)
      return quantity * ratio;
    } else if (unitType === 'SMALLER') {
      // وحدة أصغر (مثل سنتيمتر بالنسبة للمتر)
      return quantity / ratio;
    } else {
      // fallback
      return quantity;
    }
  }

  private async getBaseUnitForProduct(productId: number): Promise<any> {
    // البحث عن الوحدة الأساسية للمنتج
    const product = await this.tenantPrisma.client.product.findUnique({
      where: { id: productId },
      include: {
        salesUnit: {
          include: {
            category: true,
          },
        },
        purchaseUnit: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!product) return null;

    // البحث عن الوحدة الأساسية في نفس فئة وحدة البيع
    if (product.salesUnit) {
      const baseUnit = await this.tenantPrisma.client.unit.findFirst({
        where: {
          categoryId: product.salesUnit.categoryId,
          type: 'MAIN',
        },
      });
      return baseUnit;
    }

    // إذا لم توجد وحدة بيع، البحث في فئة وحدة الشراء
    if (product.purchaseUnit) {
      const baseUnit = await this.tenantPrisma.client.unit.findFirst({
        where: {
          categoryId: product.purchaseUnit.categoryId,
          type: 'MAIN',
        },
      });
      return baseUnit;
    }

    return null;
  }

  private async transformStock(stock: any): Promise<Stock> {
    const totalQuantity = await this.calculateStockQuantity(stock.id);
    const baseUnit = await this.getBaseUnitForProduct(stock.productId);

    // Calculate threshold: use stock.reorderLevel if set, otherwise product.minStockAlert
    // Use != null to properly handle Prisma Decimal (0 is falsy but valid)
    const reorderLevel =
      stock.reorderLevel != null ? Number(stock.reorderLevel) : null;
    const minStockAlert =
      stock.product?.minStockAlert != null
        ? Number(stock.product.minStockAlert)
        : null;
    const threshold = reorderLevel ?? minStockAlert ?? 0;

    // Calculate status based on quantity vs threshold
    let status: StockStatus;

    if (totalQuantity === 0) {
      status = StockStatus.OUT_OF_STOCK;
    } else if (threshold > 0 && totalQuantity <= threshold) {
      status = StockStatus.LOW_STOCK;
    } else {
      status = StockStatus.IN_STOCK;
    }

    return new Stock({
      ...stock,
      quantity: totalQuantity,
      reorderLevel: reorderLevel,
      threshold: threshold,
      status: status,
      product: stock.product
        ? {
            ...stock.product,
            purchasePrice:
              stock.product.purchasePrice != null
                ? Number(stock.product.purchasePrice)
                : null,
            salePrice:
              stock.product.salePrice != null
                ? Number(stock.product.salePrice)
                : null,
            minStockAlert: minStockAlert,
          }
        : undefined,
      trackings: stock.trackings || [],
      baseUnit: baseUnit,
    });
  }

  async create(createStockDto: CreateStockDto): Promise<Stock> {
    // التحقق من وجود المنتج
    const product = await this.tenantPrisma.client.product.findUnique({
      where: { id: createStockDto.productId },
      include: {
        salesUnit: true,
        purchaseUnit: true,
      },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    // التحقق من أن المنتج ليس خدمة
    if (product.type === 'SERVICE') {
      throw new BadRequestException('لا يمكن إضافة الخدمات إلى المخزون');
    }

    // التحقق من وجود المخزن
    const warehouse = await this.tenantPrisma.client.warehouse.findUnique({
      where: { id: createStockDto.warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException('المخزن غير موجود');
    }

    // التحقق من وجود وحدة التخزين إذا تم تحديدها
    if (createStockDto.tracking.storageUnitId) {
      const storageUnit = await this.tenantPrisma.client.unit.findUnique({
        where: { id: createStockDto.tracking.storageUnitId },
      });

      if (!storageUnit) {
        throw new NotFoundException('وحدة التخزين غير موجودة');
      }
    }

    // التحقق من صحة بيانات التتبع
    this.validateTrackingData(createStockDto.tracking);

    return await this.tenantPrisma.client.$transaction(async (prisma) => {
      // البحث عن مخزون موجود للمنتج في نفس المخزن
      let stock = await prisma.stock.findFirst({
        where: {
          productId: createStockDto.productId,
          warehouseId: createStockDto.warehouseId,
        },
        include: {
          product: {
            include: {
              salesUnit: true,
              purchaseUnit: true,
            },
          },
          warehouse: true,
          trackings: {
            where: { isActive: true, isDeleted: false },
            include: { storageUnit: true },
          },
        },
      });

      // إذا لم يكن هناك مخزون موجود، إنشاء مخزون جديد
      if (!stock) {
        const newStock = await prisma.stock.create({
          data: {
            productId: createStockDto.productId,
            warehouseId: createStockDto.warehouseId,
            reorderLevel: createStockDto.reorderLevel,
            lastUpdated: new Date(),
          },
        });

        // Fetch with includes
        stock = await prisma.stock.findUnique({
          where: { id: newStock.id },
          include: {
            product: {
              include: {
                salesUnit: true,
                purchaseUnit: true,
              },
            },
            warehouse: true,
            trackings: {
              where: { isActive: true, isDeleted: false },
              include: { storageUnit: true },
            },
          },
        });
      } else {
        // تحديث reorderLevel إذا تم توفيره
        if (createStockDto.reorderLevel !== undefined) {
          await prisma.stock.update({
            where: { id: stock.id },
            data: {
              reorderLevel: createStockDto.reorderLevel,
              lastUpdated: new Date(),
            },
          });

          // Fetch updated stock with includes
          stock = await prisma.stock.findUnique({
            where: { id: stock.id },
            include: {
              product: {
                include: {
                  salesUnit: true,
                  purchaseUnit: true,
                },
              },
              warehouse: true,
              trackings: {
                where: { isActive: true, isDeleted: false },
                include: { storageUnit: true },
              },
            },
          });
        }
      }

      // إنشاء تتبع جديد
      const trackingData = {
        stockId: stock.id,
        trackingType: createStockDto.tracking.trackingType,
        lotNumber: createStockDto.tracking.lotNumber,
        serialNumber: createStockDto.tracking.serialNumber,
        batchName: createStockDto.tracking.batchName,
        storageUnitId:
          createStockDto.tracking.storageUnitId || product.salesUnitId,
        quantity: createStockDto.tracking.quantity,
        productionDate: createStockDto.tracking.productionDate,
        expiryDate: createStockDto.tracking.expiryDate,
        supplierName: createStockDto.tracking.supplierName,
        notes: createStockDto.tracking.notes,
      };

      const tracking = await prisma.tracking.create({
        data: trackingData,
      });

      // إنشاء معاملة مخزون
      await prisma.warehouseTransaction.create({
        data: {
          type: 'ADD',
          toWarehouseId: createStockDto.warehouseId,
          totalPrice:
            createStockDto.tracking.quantity *
            Number(product.purchasePrice || 0),
          note: `إضافة مخزون جديد - ${createStockDto.tracking.trackingType}`,
          partyName: createStockDto.tracking.supplierName,
          items: {
            create: {
              productId: createStockDto.productId,
              quantity: createStockDto.tracking.quantity,
              unitPrice: product.purchasePrice,
              totalPrice:
                createStockDto.tracking.quantity *
                Number(product.purchasePrice || 0),
              trackingId: tracking.id,
            },
          },
        },
      });

      // إرجاع المخزون المحدث
      return await this.transformStock(stock);
    });
  }

  private validateTrackingData(tracking: any): void {
    // التحقق من صحة بيانات التتبع حسب النوع
    switch (tracking.trackingType) {
      case 'LOT':
        if (!tracking.lotNumber && !tracking.batchName) {
          throw new BadRequestException(
            'رقم الدفعة أو اسم الدفعة مطلوب للتتبع بالدفعات',
          );
        }
        break;
      case 'SERIAL':
        if (!tracking.serialNumber) {
          throw new BadRequestException(
            'الرقم التسلسلي مطلوب للتتبع بالأرقام التسلسلية',
          );
        }
        if (tracking.quantity !== 1) {
          throw new BadRequestException(
            'الكمية يجب أن تكون 1 للتتبع بالأرقام التسلسلية',
          );
        }
        break;
      case 'NONE':
        // لا توجد متطلبات خاصة للتتبع العادي
        break;
      default:
        throw new BadRequestException('نوع التتبع غير صحيح');
    }
  }

  async findAll(query: StockQueryDto) {
    const {
      search,
      productId,
      warehouseId,
      // departmentId, // Removed: not in current schema
      lowStock,
      outOfStock,
      minQuantity,
      maxQuantity,
      page = 1,
      limit = 10,
    } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { barcode: { contains: search, mode: 'insensitive' } } },
        { warehouse: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    // Note: Department filtering removed as departments are not in current schema
    // if (departmentId) {
    //   where.warehouse = {
    //     departmentId: departmentId,
    //   };
    // }

    // Check if quantity-based filters are applied
    const hasQuantityFilters =
      lowStock === true ||
      outOfStock === true ||
      minQuantity !== undefined ||
      maxQuantity !== undefined;

    // If quantity-based filters are applied, fetch ALL stocks first (no pagination at DB level)
    // because quantity is calculated from trackings and filtering must happen after transformation
    const stocks = await this.tenantPrisma.client.stock.findMany({
      where,
      include: {
        product: {
          include: {
            salesUnit: true,
            purchaseUnit: true,
          },
        },
        warehouse: true,
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
      orderBy: { lastUpdated: 'desc' },
      // Only apply DB-level pagination when NO quantity-based filters are used
      ...(hasQuantityFilters ? {} : { skip: (page - 1) * limit, take: limit }),
    });

    const transformedStocks = await Promise.all(
      stocks.map((stock) => this.transformStock(stock)),
    );

    // Apply quantity-based filters after transformation
    let filteredStocks = transformedStocks;

    if (lowStock === true) {
      filteredStocks = filteredStocks.filter(
        (stock) => stock.status === StockStatus.LOW_STOCK,
      );
    }

    if (outOfStock === true) {
      filteredStocks = filteredStocks.filter(
        (stock) => stock.status === StockStatus.OUT_OF_STOCK,
      );
    }

    if (minQuantity !== undefined) {
      filteredStocks = filteredStocks.filter(
        (stock) => stock.quantity >= minQuantity,
      );
    }

    if (maxQuantity !== undefined) {
      filteredStocks = filteredStocks.filter(
        (stock) => stock.quantity <= maxQuantity,
      );
    }

    // Calculate pagination
    const filteredTotal = filteredStocks.length;

    // Apply pagination after filtering (for quantity-based filters) or return as-is (already paginated from DB)
    let paginatedStocks: typeof filteredStocks;
    let total: number;

    if (hasQuantityFilters) {
      // Paginate the filtered results
      const startIndex = (page - 1) * limit;
      paginatedStocks = filteredStocks.slice(startIndex, startIndex + limit);
      total = filteredTotal;
    } else {
      // Already paginated from DB, get total count
      paginatedStocks = filteredStocks;
      total = await this.tenantPrisma.client.stock.count({ where });
    }

    return {
      data: paginatedStocks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Stock> {
    const stock = await this.tenantPrisma.client.stock.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            salesUnit: true,
            purchaseUnit: true,
          },
        },
        warehouse: {
          include: {
            // department: true, // Removed: not in current schema
          },
        },
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
    });

    if (!stock) {
      throw new NotFoundException('المخزون غير موجود');
    }

    return await this.transformStock(stock);
  }

  async findByProductAndWarehouse(
    productId: number,
    warehouseId: number,
  ): Promise<Stock | null> {
    const stock = await this.tenantPrisma.client.stock.findFirst({
      where: {
        productId,
        warehouseId,
      },
      include: {
        product: {
          include: {
            salesUnit: true,
            purchaseUnit: true,
          },
        },
        warehouse: {
          include: {
            // department: true, // Removed: not in current schema
          },
        },
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
    });

    return stock ? this.transformStock(stock) : null;
  }

  async update(id: number, updateStockDto: UpdateStockDto): Promise<Stock> {
    const stock = await this.tenantPrisma.client.stock.findUnique({
      where: { id },
    });

    if (!stock) {
      throw new NotFoundException('المخزون غير موجود');
    }

    // التحقق من المنتج إذا تم تغييره
    if (updateStockDto.productId) {
      const product = await this.tenantPrisma.client.product.findUnique({
        where: { id: updateStockDto.productId },
      });

      if (!product) {
        throw new NotFoundException('المنتج غير موجود');
      }
    }

    // التحقق من المخزن إذا تم تغييره
    if (updateStockDto.warehouseId) {
      const warehouse = await this.tenantPrisma.client.warehouse.findUnique({
        where: { id: updateStockDto.warehouseId },
      });

      if (!warehouse) {
        throw new NotFoundException('المخزن غير موجود');
      }
    }

    // التحقق من عدم وجود مخزون آخر للمنتج في المخزن الجديد
    if (updateStockDto.productId && updateStockDto.warehouseId) {
      const existingStock = await this.tenantPrisma.client.stock.findFirst({
        where: {
          productId: updateStockDto.productId,
          warehouseId: updateStockDto.warehouseId,
          id: { not: id },
        },
      });

      if (existingStock) {
        throw new ConflictException(
          'المخزون موجود مسبقاً لهذا المنتج في هذا المخزن',
        );
      }
    }

    const updatedStock = await this.tenantPrisma.client.stock.update({
      where: { id },
      data: {
        ...updateStockDto,
        lastUpdated: new Date(),
      },
      include: {
        product: {
          include: {
            salesUnit: true,
            purchaseUnit: true,
          },
        },
        warehouse: {
          include: {
            // department: true, // Removed: not in current schema
          },
        },
      },
    });

    return this.transformStock(updatedStock);
  }

  async remove(id: number): Promise<void> {
    const stock = await this.tenantPrisma.client.stock.findUnique({
      where: { id },
    });

    if (!stock) {
      throw new NotFoundException('المخزون غير موجود');
    }

    // التحقق من وجود حركات للمخزون
    const transactionsCount = await this.tenantPrisma.client.warehouseTransaction.count({
      where: {
        OR: [
          {
            fromWarehouseId: stock.warehouseId,
            items: {
              some: {
                productId: stock.productId,
              },
            },
          },
          {
            toWarehouseId: stock.warehouseId,
            items: {
              some: {
                productId: stock.productId,
              },
            },
          },
        ],
      },
    });

    if (transactionsCount > 0) {
      throw new ConflictException('لا يمكن حذف المخزون لأنه يحتوي على حركات');
    }

    await this.tenantPrisma.client.stock.delete({
      where: { id },
    });
  }

  async transferStock(
    transferDto: StockTransferDto,
  ): Promise<{ fromStock: Stock; toStock: Stock }> {
    const { productId, fromWarehouseId, toWarehouseId, quantity, note } =
      transferDto;

    // التحقق من عدم نقل المخزون لنفس المخزن
    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('لا يمكن نقل المخزون لنفس المخزن');
    }

    // التحقق من وجود المنتج
    const product = await this.tenantPrisma.client.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    // التحقق من وجود المخازن
    const [fromWarehouse, toWarehouse] = await Promise.all([
      this.tenantPrisma.client.warehouse.findUnique({ where: { id: fromWarehouseId } }),
      this.tenantPrisma.client.warehouse.findUnique({ where: { id: toWarehouseId } }),
    ]);

    if (!fromWarehouse) {
      throw new NotFoundException('المخزن المصدر غير موجود');
    }

    if (!toWarehouse) {
      throw new NotFoundException('المخزن الهدف غير موجود');
    }

    // استخدام transaction لضمان التطابق
    const result = await this.tenantPrisma.client.$transaction(async (prisma) => {
      // الحصول على المخزون المصدر
      const fromStock = await prisma.stock.findFirst({
        where: { productId, warehouseId: fromWarehouseId },
        include: {
          trackings: {
            where: { isActive: true, isDeleted: false },
            include: { storageUnit: true },
          },
        },
      });

      if (!fromStock) {
        throw new NotFoundException('المخزون غير موجود في المخزن المصدر');
      }

      // حساب الكمية المتاحة
      const availableQuantity = fromStock.trackings.reduce((sum, tracking) => {
        return (
          sum +
          this.convertToBaseUnit(
            Number(tracking.quantity),
            tracking.storageUnit,
          )
        );
      }, 0);

      if (availableQuantity < quantity) {
        throw new BadRequestException('الكمية المتاحة أقل من المطلوب');
      }

      // الحصول على المخزون الهدف أو إنشاؤه
      let toStock = await prisma.stock.findFirst({
        where: { productId, warehouseId: toWarehouseId },
        include: {
          product: { include: { salesUnit: true, purchaseUnit: true } },
          warehouse: true,
        },
      });

      if (!toStock) {
        // إنشاء مخزون جديد
        toStock = await prisma.stock.create({
          data: {
            productId,
            warehouseId: toWarehouseId,
            lastUpdated: new Date(),
          },
          include: {
            product: { include: { salesUnit: true, purchaseUnit: true } },
            warehouse: true,
          },
        });
      }

      // إنشاء تتبع جديد في المخزن الهدف
      await prisma.tracking.create({
        data: {
          stockId: toStock.id,
          trackingType: 'NONE', // يمكن تحسين هذا لاحقاً
          quantity: quantity,
          storageUnitId: product.salesUnitId, // استخدام وحدة البيع كوحدة تخزين افتراضية
          notes: `نقل من المخزن ${fromWarehouse.name}`,
        },
      });

      // إنشاء حركة النقل
      await prisma.warehouseTransaction.create({
        data: {
          type: 'TRANSFER',
          fromWarehouseId,
          toWarehouseId,
          totalPrice: quantity * Number(product.purchasePrice || 0),
          note,
          items: {
            create: [
              {
                productId,
                quantity,
                unitPrice: product.purchasePrice || 0,
                totalPrice: quantity * Number(product.purchasePrice || 0),
              },
            ],
          },
        },
      });

      return {
        fromStock: await this.transformStock(fromStock),
        toStock: await this.transformStock(toStock),
      };
    });

    return result;
  }

  async adjustStock(adjustmentDto: StockAdjustmentDto): Promise<Stock> {
    const { productId, warehouseId, type, quantity, reason } = adjustmentDto;

    // التحقق من وجود المنتج والمخزن
    const [product, warehouse] = await Promise.all([
      this.tenantPrisma.client.product.findUnique({ where: { id: productId } }),
      this.tenantPrisma.client.warehouse.findUnique({ where: { id: warehouseId } }),
    ]);

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    if (!warehouse) {
      throw new NotFoundException('المخزن غير موجود');
    }

    const result = await this.tenantPrisma.client.$transaction(async (prisma) => {
      // الحصول على المخزون الحالي
      let stock = await prisma.stock.findFirst({
        where: { productId, warehouseId },
        include: {
          trackings: {
            where: { isActive: true, isDeleted: false },
            include: { storageUnit: true },
          },
        },
      });

      if (!stock) {
        // إنشاء مخزون جديد
        if (type === AdjustmentType.DECREASE) {
          throw new BadRequestException('لا يمكن تقليل مخزون غير موجود');
        }

        const newStock = await prisma.stock.create({
          data: {
            productId,
            warehouseId,
            lastUpdated: new Date(),
          },
        });

        // Fetch with includes
        stock = await prisma.stock.findUnique({
          where: { id: newStock.id },
          include: {
            product: { include: { salesUnit: true, purchaseUnit: true } },
            warehouse: true,
            trackings: {
              where: { isActive: true, isDeleted: false },
              include: { storageUnit: true },
            },
          },
        });
      }

      // حساب الكمية الحالية
      const currentQuantity = stock!.trackings.reduce((sum, tracking) => {
        return (
          sum +
          this.convertToBaseUnit(
            Number(tracking.quantity),
            tracking.storageUnit,
          )
        );
      }, 0);

      let adjustmentQuantity: number;

      switch (type) {
        case AdjustmentType.INCREASE:
          adjustmentQuantity = quantity;
          break;
        case AdjustmentType.DECREASE:
          if (currentQuantity < quantity) {
            throw new BadRequestException('الكمية المتاحة أقل من المطلوب');
          }
          adjustmentQuantity = -quantity;
          break;
        case AdjustmentType.SET:
          adjustmentQuantity = quantity - currentQuantity;
          break;
      }

      // إنشاء تتبع للتعديل (فقط للزيادة)
      if (adjustmentQuantity > 0) {
        await prisma.tracking.create({
          data: {
            stockId: stock!.id,
            trackingType: 'NONE',
            quantity: adjustmentQuantity,
            storageUnitId: product.salesUnitId,
            notes: `تعديل مخزون - زيادة: ${reason}`,
          },
        });
      } else if (adjustmentQuantity < 0) {
        // للنقص، نحتاج إلى تقليل من التتبع الموجود
        const absQuantity = Math.abs(adjustmentQuantity);
        const trackings = await prisma.tracking.findMany({
          where: {
            stockId: stock!.id,
            isActive: true,
            isDeleted: false,
          },
          orderBy: { createdAt: 'asc' }, // FIFO
        });

        let remainingToDeduct = absQuantity;
        for (const tracking of trackings) {
          if (remainingToDeduct <= 0) break;

          const trackingQuantity = Number(tracking.quantity);
          if (trackingQuantity <= remainingToDeduct) {
            // حذف التتبع بالكامل
            await prisma.tracking.update({
              where: { id: tracking.id },
              data: { isDeleted: true },
            });
            remainingToDeduct -= trackingQuantity;
          } else {
            // تقليل الكمية من التتبع
            await prisma.tracking.update({
              where: { id: tracking.id },
              data: { quantity: trackingQuantity - remainingToDeduct },
            });
            remainingToDeduct = 0;
          }
        }
      }

      // إنشاء حركة التعديل
      await prisma.warehouseTransaction.create({
        data: {
          type: 'ADJUST',
          toWarehouseId: warehouseId,
          totalPrice: 0,
          note: `تعديل مخزون: ${reason}`,
          items: {
            create: [
              {
                productId,
                quantity: Math.abs(adjustmentQuantity),
                unitPrice: product.purchasePrice || 0,
                totalPrice: 0,
              },
            ],
          },
        },
      });

      return await this.transformStock(stock);
    });

    return result;
  }

  async getStockStats() {
    const [totalStocks, totalProducts, totalWarehouses] = await Promise.all([
      this.tenantPrisma.client.stock.count(),
      this.tenantPrisma.client.stock
        .groupBy({
          by: ['productId'],
          _count: { productId: true },
        })
        .then((result) => result.length),
      this.tenantPrisma.client.stock
        .groupBy({
          by: ['warehouseId'],
          _count: { warehouseId: true },
        })
        .then((result) => result.length),
    ]);

    // حساب الإحصائيات من Tracking
    const stocksWithTrackings = await this.tenantPrisma.client.stock.findMany({
      include: {
        product: {
          select: {
            salePrice: true,
          },
        },
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
    });

    let totalQuantity = 0;
    let totalValue = 0;

    stocksWithTrackings.forEach((stock) => {
      const stockQuantity = stock.trackings.reduce((sum, tracking) => {
        return (
          sum +
          this.convertToBaseUnit(
            Number(tracking.quantity),
            tracking.storageUnit,
          )
        );
      }, 0);

      totalQuantity += stockQuantity;
      totalValue += stockQuantity * Number(stock.product.salePrice || 0);
    });

    return {
      totalStocks,
      totalProducts,
      totalWarehouses,
      totalQuantity,
      totalValue,
    };
  }

  async createBulk(createStockDtos: CreateStockDto[]): Promise<{
    success: Stock[];
    failed: { dto: CreateStockDto; error: string }[];
  }> {
    const success: Stock[] = [];
    const failed: { dto: CreateStockDto; error: string }[] = [];

    for (const dto of createStockDtos) {
      try {
        const stock = await this.create(dto);
        success.push(stock);
      } catch (error) {
        failed.push({
          dto,
          error: error.message || 'خطأ غير معروف',
        });
      }
    }

    return { success, failed };
  }

  async getStockAlerts() {
    // Get all stocks - we need to check both stock.reorderLevel AND product.minStockAlert
    const stocks = await this.tenantPrisma.client.stock.findMany({
      where: {
        OR: [
          { reorderLevel: { gt: 0 } },
          { product: { minStockAlert: { gt: 0 } } },
        ],
      },
      include: {
        product: {
          include: {
            salesUnit: true,
            purchaseUnit: true,
          },
        },
        warehouse: true,
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
    });

    const transformedStocks = await Promise.all(
      stocks.map((stock) => this.transformStock(stock)),
    );

    // Categorize alerts using the status field (already calculated in transformStock)
    const lowStockItems = transformedStocks.filter(
      (stock) => stock.status === StockStatus.LOW_STOCK,
    );
    const outOfStockItems = transformedStocks.filter(
      (stock) => stock.status === StockStatus.OUT_OF_STOCK,
    );

    const nearExpiryItems = await this.getNearExpiryItems();

    return {
      lowStock: lowStockItems,
      outOfStock: outOfStockItems,
      nearExpiry: nearExpiryItems,
      summary: {
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        nearExpiryCount: nearExpiryItems.length,
      },
    };
  }

  private async getNearExpiryItems(daysUntilExpiry: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    const trackings = await this.tenantPrisma.client.tracking.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        expiryDate: {
          lte: expiryDate,
          gte: new Date(),
        },
      },
      include: {
        stock: {
          include: {
            product: {
              include: {
                salesUnit: true,
                purchaseUnit: true,
              },
            },
            warehouse: true,
          },
        },
        storageUnit: true,
      },
    });

    return trackings.map((tracking) => ({
      trackingId: tracking.id,
      product: tracking.stock.product,
      warehouse: tracking.stock.warehouse,
      quantity: Number(tracking.quantity),
      unit: tracking.storageUnit,
      expiryDate: tracking.expiryDate,
      daysUntilExpiry: Math.ceil(
        (tracking.expiryDate!.getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      lotNumber: tracking.lotNumber,
      serialNumber: tracking.serialNumber,
      batchName: tracking.batchName,
    }));
  }
}
