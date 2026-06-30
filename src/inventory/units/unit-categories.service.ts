import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUnitCategoryDto } from './dto/create-unit-category.dto';
import { UnitCategoryQueryDto } from './dto/unit-category-query.dto';
import { UpdateUnitCategoryDto } from './dto/update-unit-category.dto';
import { UnitCategory } from './entities/unit-category.entity';
import { Unit } from './entities/unit.entity';

@Injectable()
export class UnitCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createUnitCategoryDto: CreateUnitCategoryDto,
  ): Promise<UnitCategory> {
    // التحقق من وجود فئة الوحدة
    const existingCategory = await this.prisma.unitCategory.findUnique({
      where: { name: createUnitCategoryDto.name },
    });

    if (existingCategory) {
      throw new ConflictException('اسم فئة الوحدة موجود مسبقاً');
    }

    const category = await this.prisma.unitCategory.create({
      data: createUnitCategoryDto,
    });

    return new UnitCategory(category);
  }

  async findAll(query: UnitCategoryQueryDto) {
    const { search, isActive, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [categories, total] = await Promise.all([
      this.prisma.unitCategory.findMany({
        where,
        include: {
          units: {
            where: { isDeleted: false },
            select: {
              id: true,
              name: true,
              symbol: true,
              type: true,
              ratio: true,
              isActive: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.unitCategory.count({ where }),
    ]);

    return {
      data: categories.map(
        (category) =>
          new UnitCategory({
            ...category,
            units: category.units.map(
              (unit) =>
                new Unit({
                  ...unit,
                  ratio: Number(unit.ratio),
                }),
            ),
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

  async findOne(id: number): Promise<UnitCategory> {
    const category = await this.prisma.unitCategory.findFirst({
      where: { id, isDeleted: false },
      include: {
        units: {
          where: { isDeleted: false },
          orderBy: { type: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('فئة الوحدة غير موجودة');
    }

    return new UnitCategory({
      ...category,
      units: category.units.map(
        (unit) =>
          new Unit({
            ...unit,
            ratio: Number(unit.ratio),
          }),
      ),
    });
  }

  async update(
    id: number,
    updateUnitCategoryDto: UpdateUnitCategoryDto,
  ): Promise<UnitCategory> {
    // التحقق من وجود فئة الوحدة
    const existingCategory = await this.prisma.unitCategory.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingCategory) {
      throw new NotFoundException('فئة الوحدة غير موجودة');
    }

    // التحقق من الاسم إذا تم تغييره
    if (
      updateUnitCategoryDto.name &&
      updateUnitCategoryDto.name !== existingCategory.name
    ) {
      const duplicateCategory = await this.prisma.unitCategory.findUnique({
        where: { name: updateUnitCategoryDto.name },
      });

      if (duplicateCategory) {
        throw new ConflictException('اسم فئة الوحدة موجود مسبقاً');
      }
    }

    const category = await this.prisma.unitCategory.update({
      where: { id },
      data: updateUnitCategoryDto,
    });

    return new UnitCategory(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.prisma.unitCategory.findFirst({
      where: { id, isDeleted: false },
    });

    if (!category) {
      throw new NotFoundException('فئة الوحدة غير موجودة');
    }

    // التحقق من وجود وحدات تستخدم هذه الفئة
    const unitsCount = await this.prisma.unit.count({
      where: { categoryId: id, isDeleted: false },
    });

    if (unitsCount > 0) {
      throw new ConflictException(
        'لا يمكن حذف فئة الوحدة لأنها تحتوي على وحدات',
      );
    }

    // Soft delete
    await this.prisma.unitCategory.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getCategoryStats() {
    const [totalCategories, activeCategories, categoriesWithUnits] =
      await Promise.all([
        this.prisma.unitCategory.count({ where: { isDeleted: false } }),
        this.prisma.unitCategory.count({
          where: { isDeleted: false, isActive: true },
        }),
        this.prisma.unitCategory.count({
          where: {
            isDeleted: false,
            units: {
              some: { isDeleted: false },
            },
          },
        }),
      ]);

    return {
      totalCategories,
      activeCategories,
      inactiveCategories: totalCategories - activeCategories,
      categoriesWithUnits,
      categoriesWithoutUnits: totalCategories - categoriesWithUnits,
    };
  }

  async getCategoryUnits(id: number) {
    const category = await this.prisma.unitCategory.findFirst({
      where: { id, isDeleted: false },
      include: {
        units: {
          where: { isDeleted: false },
          orderBy: [{ type: 'asc' }, { ratio: 'asc' }],
        },
      },
    });

    if (!category) {
      throw new NotFoundException('فئة الوحدة غير موجودة');
    }

    return {
      category: new UnitCategory({
        ...category,
        units: undefined, // Don't include units here to avoid circular nesting
      }),
      units: category.units.map(
        (unit) =>
          new Unit({
            ...unit,
            ratio: Number(unit.ratio),
          }),
      ),
      unitsCount: category.units.length,
    };
  }

  async createPresetCategories() {
    const presetCategories = [
      {
        name: 'طول',
        description: 'وحدات قياس الطول والمسافة',
        units: [
          { name: 'متر', symbol: 'م', type: 'MAIN', ratio: 1.0 },
          { name: 'سنتيمتر', symbol: 'سم', type: 'SMALLER', ratio: 100 },
          { name: 'مليمتر', symbol: 'مم', type: 'SMALLER', ratio: 1000 },
          { name: 'كيلومتر', symbol: 'كم', type: 'BIGGER', ratio: 1000 },
        ],
      },
      {
        name: 'وزن',
        description: 'وحدات قياس الوزن والكتلة',
        units: [
          { name: 'كيلوغرام', symbol: 'كغ', type: 'MAIN', ratio: 1.0 },
          { name: 'غرام', symbol: 'غ', type: 'SMALLER', ratio: 1000 },
          { name: 'طن', symbol: 'طن', type: 'BIGGER', ratio: 1000 },
          { name: 'مليغرام', symbol: 'مغ', type: 'SMALLER', ratio: 1000000 },
        ],
      },
      {
        name: 'حجم',
        description: 'وحدات قياس الحجم والسعة',
        units: [
          { name: 'لتر', symbol: 'ل', type: 'MAIN', ratio: 1.0 },
          { name: 'مليلتر', symbol: 'مل', type: 'SMALLER', ratio: 1000 },
          { name: 'متر مكعب', symbol: 'م³', type: 'BIGGER', ratio: 1000 },
        ],
      },
      {
        name: 'عدد',
        description: 'وحدات العد والكمية',
        units: [
          { name: 'قطعة', symbol: 'قطعة', type: 'MAIN', ratio: 1.0 },
          { name: 'دزينة', symbol: 'دزينة', type: 'BIGGER', ratio: 12 },
          { name: 'كرتون', symbol: 'كرتون', type: 'BIGGER', ratio: 24 },
          { name: 'صندوق', symbol: 'صندوق', type: 'BIGGER', ratio: 100 },
        ],
      },
      {
        name: 'زمن',
        description: 'وحدات قياس الزمن',
        units: [
          { name: 'ثانية', symbol: 'ث', type: 'MAIN', ratio: 1.0 },
          { name: 'دقيقة', symbol: 'د', type: 'BIGGER', ratio: 60 },
          { name: 'ساعة', symbol: 'س', type: 'BIGGER', ratio: 3600 },
          { name: 'يوم', symbol: 'يوم', type: 'BIGGER', ratio: 86400 },
        ],
      },
    ];

    const createdCategories = [];

    for (const preset of presetCategories) {
      // Check if category already exists
      const existingCategory = await this.prisma.unitCategory.findFirst({
        where: { name: preset.name, isDeleted: false },
      });

      if (!existingCategory) {
        // Create category
        const category = await this.prisma.unitCategory.create({
          data: {
            name: preset.name,
            description: preset.description,
          },
        });

        // Create units for this category
        const units = await Promise.all(
          preset.units.map((unitData) =>
            this.prisma.unit.create({
              data: {
                name: unitData.name,
                symbol: unitData.symbol,
                type: unitData.type as any, // Cast to handle enum type
                ratio: unitData.ratio,
                categoryId: category.id,
              },
            }),
          ),
        );

        createdCategories.push({
          category: new UnitCategory(category),
          units: units.map(
            (unit) =>
              new Unit({
                ...unit,
                ratio: Number(unit.ratio),
              }),
          ),
        });
      }
    }

    return {
      message: 'تم إنشاء الفئات المسبقة بنجاح',
      createdCategories,
      totalCreated: createdCategories.length,
    };
  }
}
