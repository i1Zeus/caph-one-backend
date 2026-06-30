import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBulkUnitsDto } from './dto/create-bulk-units.dto';
import { CreateUnitDto, UnitType } from './dto/create-unit.dto';
import { UnitQueryDto } from './dto/unit-query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from './entities/unit.entity';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUnitDto: CreateUnitDto): Promise<Unit> {
    // التحقق من وجود فئة الوحدة
    const category = await this.prisma.unitCategory.findFirst({
      where: { id: createUnitDto.categoryId, isDeleted: false },
    });

    if (!category) {
      throw new NotFoundException('فئة الوحدة غير موجودة');
    }

    // التحقق من وجود الوحدة في نفس الفئة
    const existingUnit = await this.prisma.unit.findFirst({
      where: {
        name: createUnitDto.name,
        categoryId: createUnitDto.categoryId,
        isDeleted: false,
      },
    });

    if (existingUnit) {
      throw new ConflictException('اسم الوحدة موجود مسبقاً في هذه الفئة');
    }

    // التحقق من منطق النسبة
    this.validateUnitRatio(
      createUnitDto.type || UnitType.MAIN,
      createUnitDto.ratio || 1.0,
    );

    const unit = await this.prisma.unit.create({
      data: {
        ...createUnitDto,
        type: createUnitDto.type || UnitType.MAIN,
        ratio: createUnitDto.ratio || 1.0,
      },
      include: {
        category: true,
      },
    });

    return new Unit({
      ...unit,
      ratio: Number(unit.ratio),
    });
  }

  async createBulk(
    createBulkUnitsDto: CreateBulkUnitsDto,
  ): Promise<{ success: Unit[]; failed: { unit: any; error: string }[] }> {
    const { categoryId, units } = createBulkUnitsDto;

    // التحقق من وجود فئة الوحدة
    const category = await this.prisma.unitCategory.findFirst({
      where: { id: categoryId, isDeleted: false },
    });

    if (!category) {
      throw new NotFoundException('فئة الوحدة غير موجودة');
    }

    const success: Unit[] = [];
    const failed: { unit: any; error: string }[] = [];

    // معالجة كل وحدة بشكل منفصل
    for (const unitData of units) {
      try {
        // التحقق من وجود الوحدة في نفس الفئة
        const existingUnit = await this.prisma.unit.findFirst({
          where: {
            name: unitData.name,
            categoryId: categoryId,
            isDeleted: false,
          },
        });

        if (existingUnit) {
          failed.push({
            unit: unitData,
            error: `اسم الوحدة '${unitData.name}' موجود مسبقاً في هذه الفئة`,
          });
          continue;
        }

        // التحقق من منطق النسبة
        this.validateUnitRatio(
          unitData.type || UnitType.MAIN,
          unitData.ratio || 1.0,
        );

        // إنشاء الوحدة
        const createdUnit = await this.prisma.unit.create({
          data: {
            ...unitData,
            categoryId,
            type: unitData.type || UnitType.MAIN,
            ratio: unitData.ratio || 1.0,
          },
          include: {
            category: true,
          },
        });

        success.push(
          new Unit({
            ...createdUnit,
            ratio: Number(createdUnit.ratio),
          }),
        );
      } catch (error) {
        failed.push({
          unit: unitData,
          error: error.message || 'خطأ غير معروف',
        });
      }
    }

    return { success, failed };
  }

  async findAll(query: UnitQueryDto) {
    const { search, isActive, categoryId, type, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { symbol: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [units, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        include: {
          category: true,
        },
        skip,
        take: limit,
        orderBy: [{ categoryId: 'asc' }, { type: 'asc' }, { ratio: 'asc' }],
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      data: units.map(
        (unit) =>
          new Unit({
            ...unit,
            ratio: Number(unit.ratio),
          }),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Unit> {
    const unit = await this.prisma.unit.findFirst({
      where: { id, isDeleted: false },
      include: {
        category: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('الوحدة غير موجودة');
    }

    return new Unit({
      ...unit,
      ratio: Number(unit.ratio),
    });
  }

  async update(id: number, updateUnitDto: UpdateUnitDto): Promise<Unit> {
    // التحقق من وجود الوحدة
    const existingUnit = await this.prisma.unit.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingUnit) {
      throw new NotFoundException('الوحدة غير موجودة');
    }

    // التحقق من فئة الوحدة إذا تم تغييرها
    if (
      updateUnitDto.categoryId &&
      updateUnitDto.categoryId !== existingUnit.categoryId
    ) {
      const category = await this.prisma.unitCategory.findFirst({
        where: { id: updateUnitDto.categoryId, isDeleted: false },
      });

      if (!category) {
        throw new NotFoundException('فئة الوحدة غير موجودة');
      }
    }

    // التحقق من الاسم إذا تم تغييره في نفس الفئة
    if (updateUnitDto.name && updateUnitDto.name !== existingUnit.name) {
      const categoryId = updateUnitDto.categoryId || existingUnit.categoryId;
      const duplicateUnit = await this.prisma.unit.findFirst({
        where: {
          name: updateUnitDto.name,
          categoryId: categoryId,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateUnit) {
        throw new ConflictException('اسم الوحدة موجود مسبقاً في هذه الفئة');
      }
    }

    // التحقق من منطق النسبة إذا تم تغييرها
    if (updateUnitDto.type || updateUnitDto.ratio) {
      const newType = updateUnitDto.type || existingUnit.type;
      const newRatio = updateUnitDto.ratio || Number(existingUnit.ratio);
      this.validateUnitRatio(newType, newRatio);
    }

    const unit = await this.prisma.unit.update({
      where: { id },
      data: updateUnitDto,
      include: {
        category: true,
      },
    });

    return new Unit({
      ...unit,
      ratio: Number(unit.ratio),
    });
  }

  async remove(id: number): Promise<void> {
    const unit = await this.prisma.unit.findFirst({
      where: { id, isDeleted: false },
    });

    if (!unit) {
      throw new NotFoundException('الوحدة غير موجودة');
    }

    // التحقق من وجود منتجات تستخدم هذه الوحدة
    const productsCount = await this.prisma.product.count({
      where: {
        OR: [{ salesUnitId: id }, { purchaseUnitId: id }],
        isDeleted: false,
      },
    });

    if (productsCount > 0) {
      throw new ConflictException('لا يمكن حذف الوحدة لأنها مستخدمة في منتجات');
    }

    // Soft delete
    await this.prisma.unit.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getUnitProducts(id: number) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, isDeleted: false },
    });

    if (!unit) {
      throw new NotFoundException('الوحدة غير موجودة');
    }

    const products = await this.prisma.product.findMany({
      where: {
        OR: [{ salesUnitId: id }, { purchaseUnitId: id }],
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        purchasePrice: true,
        salePrice: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      unit: new Unit({
        ...unit,
        ratio: Number(unit.ratio),
      }),
      products,
      productsCount: products.length,
    };
  }

  async getUnitsStats() {
    const [totalUnits, activeUnits, unitsWithProducts] = await Promise.all([
      this.prisma.unit.count({ where: { isDeleted: false } }),
      this.prisma.unit.count({ where: { isDeleted: false, isActive: true } }),
      this.prisma.unit.count({
        where: {
          isDeleted: false,
          OR: [
            {
              productsAsSalesUnit: {
                some: { isDeleted: false },
              },
            },
            {
              productsAsPurchaseUnit: {
                some: { isDeleted: false },
              },
            },
          ],
        },
      }),
    ]);

    return {
      totalUnits,
      activeUnits,
      inactiveUnits: totalUnits - activeUnits,
      unitsWithProducts,
      unitsWithoutProducts: totalUnits - unitsWithProducts,
    };
  }

  // Helper method for validating unit ratios
  private validateUnitRatio(type: UnitType, ratio: number): void {
    switch (type) {
      case UnitType.MAIN:
        if (ratio !== 1.0) {
          throw new BadRequestException('الوحدة الأساسية يجب أن تكون نسبتها 1');
        }
        break;
      case UnitType.SMALLER:
        if (ratio <= 1.0) {
          throw new BadRequestException(
            'الوحدة الأصغر يجب أن تكون نسبتها أكبر من 1',
          );
        }
        break;
      case UnitType.BIGGER:
        if (ratio <= 1.0) {
          throw new BadRequestException(
            'الوحدة الأكبر يجب أن تكون نسبتها أكبر من 1',
          );
        }
        break;
    }
  }

  // Conversion utilities
  async convertQuantity(
    quantity: number,
    fromUnitId: number,
    toUnitId: number,
  ): Promise<{
    originalQuantity: number;
    convertedQuantity: number;
    fromUnit: Unit;
    toUnit: Unit;
    conversionRatio: number;
  }> {
    if (fromUnitId === toUnitId) {
      const unit = await this.findOne(fromUnitId);
      return {
        originalQuantity: quantity,
        convertedQuantity: quantity,
        fromUnit: unit,
        toUnit: unit,
        conversionRatio: 1,
      };
    }

    const [fromUnit, toUnit] = await Promise.all([
      this.findOne(fromUnitId),
      this.findOne(toUnitId),
    ]);

    if (fromUnit.categoryId !== toUnit.categoryId) {
      throw new BadRequestException('لا يمكن التحويل بين وحدات من فئات مختلفة');
    }

    // Convert to main unit first, then to target unit
    const quantityInMainUnit = this.convertToMainUnit(quantity, fromUnit);
    const convertedQuantity = this.convertFromMainUnit(
      quantityInMainUnit,
      toUnit,
    );
    const conversionRatio = convertedQuantity / quantity;

    return {
      originalQuantity: quantity,
      convertedQuantity,
      fromUnit,
      toUnit,
      conversionRatio,
    };
  }

  private convertToMainUnit(quantity: number, unit: Unit): number {
    switch (unit.type) {
      case UnitType.MAIN:
        return quantity;
      case UnitType.SMALLER:
        return quantity / unit.ratio; // e.g., 100 cm / 100 = 1 m
      case UnitType.BIGGER:
        return quantity * unit.ratio; // e.g., 2 km * 1000 = 2000 m
      default:
        return quantity;
    }
  }

  private convertFromMainUnit(quantity: number, unit: Unit): number {
    switch (unit.type) {
      case UnitType.MAIN:
        return quantity;
      case UnitType.SMALLER:
        return quantity * unit.ratio; // e.g., 1 m * 100 = 100 cm
      case UnitType.BIGGER:
        return quantity / unit.ratio; // e.g., 2000 m / 1000 = 2 km
      default:
        return quantity;
    }
  }

  async getUnitsByCategory(categoryId: number) {
    const units = await this.prisma.unit.findMany({
      where: {
        categoryId,
        isDeleted: false,
        isActive: true,
      },
      include: {
        category: true,
      },
      orderBy: [{ type: 'asc' }, { ratio: 'asc' }],
    });

    return units.map(
      (unit) =>
        new Unit({
          ...unit,
          ratio: Number(unit.ratio),
        }),
    );
  }
}
