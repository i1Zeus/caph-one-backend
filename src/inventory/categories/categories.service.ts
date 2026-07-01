import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ProductCategory } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<ProductCategory> {
    // Check if category name already exists
    const existingCategory = await this.tenantPrisma.client.productCategory.findFirst({
      where: {
        name: createCategoryDto.name,
        isDeleted: false,
      },
    });

    if (existingCategory) {
      throw new ConflictException('اسم الفئة موجود مسبقاً');
    }

    const category = await this.tenantPrisma.client.productCategory.create({
      data: createCategoryDto,
    });

    return new ProductCategory(category);
  }

  async findAll(query: CategoryQueryDto) {
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
      this.tenantPrisma.client.productCategory.findMany({
        where,
        include: {
          products: {
            where: { product: { isDeleted: false } },
            select: {
              id: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.tenantPrisma.client.productCategory.count({ where }),
    ]);

    return {
      data: categories.map(
        (category: any) =>
          new ProductCategory({
            ...category,
            products: category.products?.map((pcr: any) => pcr.product) || [],
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

  async findOne(id: number): Promise<ProductCategory> {
    const category = await this.tenantPrisma.client.productCategory.findFirst({
      where: { id, isDeleted: false },
      include: {
        products: {
          where: { product: { isDeleted: false } },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                type: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('الفئة غير موجودة');
    }

    return new ProductCategory({
      ...category,
      products:
        (category as any).products?.map((pcr: any) => pcr.product) || [],
    });
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ProductCategory> {
    const existingCategory = await this.tenantPrisma.client.productCategory.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingCategory) {
      throw new NotFoundException('الفئة غير موجودة');
    }

    // Check if name is being changed and if it conflicts
    if (
      updateCategoryDto.name &&
      updateCategoryDto.name !== existingCategory.name
    ) {
      const duplicateCategory = await this.tenantPrisma.client.productCategory.findFirst({
        where: {
          name: updateCategoryDto.name,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicateCategory) {
        throw new ConflictException('اسم الفئة موجود مسبقاً');
      }
    }

    const category = await this.tenantPrisma.client.productCategory.update({
      where: { id },
      data: updateCategoryDto,
    });

    return new ProductCategory(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.tenantPrisma.client.productCategory.findFirst({
      where: { id, isDeleted: false },
    });

    if (!category) {
      throw new NotFoundException('الفئة غير موجودة');
    }

    // Note: We allow deletion even if category has products, but we could add a check here
    // if business logic requires preventing deletion of categories with products
    // Check if category has products
    // const productsCount = await this.tenantPrisma.client.productCategoryRelation.count({
    //   where: {
    //     categoryId: id,
    //     product: { isDeleted: false },
    //   },
    // });

    // Soft delete
    await this.tenantPrisma.client.productCategory.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getCategoryStats() {
    const [totalCategories, activeCategories, categoriesWithProducts] =
      await Promise.all([
        this.tenantPrisma.client.productCategory.count({ where: { isDeleted: false } }),
        this.tenantPrisma.client.productCategory.count({
          where: { isDeleted: false, isActive: true },
        }),
        this.tenantPrisma.client.productCategory.count({
          where: {
            isDeleted: false,
            products: {
              some: {
                product: { isDeleted: false },
              },
            },
          },
        }),
      ]);

    return {
      totalCategories,
      activeCategories,
      inactiveCategories: totalCategories - activeCategories,
      categoriesWithProducts,
      categoriesWithoutProducts: totalCategories - categoriesWithProducts,
    };
  }

  async getCategoryProducts(id: number) {
    const category = await this.tenantPrisma.client.productCategory.findFirst({
      where: { id, isDeleted: false },
      include: {
        products: {
          where: { product: { isDeleted: false } },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                type: true,
                isActive: true,
                salePrice: true,
                purchasePrice: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('الفئة غير موجودة');
    }

    const categoryWithProducts = category as any;
    return {
      category: new ProductCategory({
        ...category,
        products:
          categoryWithProducts.products?.map((pcr: any) => pcr.product) || [],
      }),
      products:
        categoryWithProducts.products?.map((pcr: any) => ({
          ...pcr.product,
          salePrice: pcr.product.salePrice
            ? Number(pcr.product.salePrice)
            : null,
          purchasePrice: pcr.product.purchasePrice
            ? Number(pcr.product.purchasePrice)
            : null,
        })) || [],
      count: categoryWithProducts.products?.length || 0,
    };
  }
}
