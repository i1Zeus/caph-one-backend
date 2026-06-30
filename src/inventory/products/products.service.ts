import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FilesService } from '../../files/files.service';
import { PrismaService } from '../../prisma/prisma.service';
import { compressImage } from '../../utils/help';
import { Unit } from '../units/entities/unit.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    imageFile?: Express.Multer.File,
    uploadedById?: string,
  ): Promise<Product> {
    // Check if barcode already exists
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        barcode: createProductDto.barcode,
        isDeleted: false,
      },
    });

    if (existingProduct) {
      throw new ConflictException('الباركود موجود بالفعل');
    }

    // Check if sales unit exists
    if (createProductDto.salesUnitId) {
      const salesUnit = await this.prisma.unit.findFirst({
        where: {
          id: createProductDto.salesUnitId,
          isDeleted: false,
          isActive: true,
        },
      });

      if (!salesUnit) {
        throw new NotFoundException('وحدة البيع غير موجودة أو غير نشطة');
      }
    }

    // Check if purchase unit exists
    if (createProductDto.purchaseUnitId) {
      const purchaseUnit = await this.prisma.unit.findFirst({
        where: {
          id: createProductDto.purchaseUnitId,
          isDeleted: false,
          isActive: true,
        },
      });

      if (!purchaseUnit) {
        throw new NotFoundException('وحدة الشراء غير موجودة أو غير نشطة');
      }
    }

    // Handle image upload if provided
    let imageUrl: string | null = null;
    if (imageFile) {
      try {
        console.log('Processing image upload:', imageFile.originalname);

        // Compress the image
        const compressedBuffer = await compressImage(imageFile.buffer);
        console.log(
          `Image compressed: ${imageFile.size} -> ${compressedBuffer.length} bytes`,
        );

        // Create a new file object with compressed buffer
        const compressedFile: Express.Multer.File = {
          ...imageFile,
          buffer: compressedBuffer,
          size: compressedBuffer.length,
        };

        // Use uploadedById if available, otherwise use 'system'
        const userId = uploadedById || 'system';
        console.log('Uploading to R2 with userId:', userId);

        // Upload to R2
        const uploadedFile = await this.filesService.uploadFile(
          compressedFile,
          userId,
        );

        imageUrl = uploadedFile.url;
        console.log('Image uploaded successfully:', imageUrl);
      } catch (error) {
        // Log error but don't fail product creation
        console.error('Failed to upload product image:', error);
        console.error('Error stack:', error.stack);
      }
    } else {
      console.log('No image file provided');
    }

    // Validate categories if provided
    const categoryIds = createProductDto.categoryIds;
    if (categoryIds && categoryIds.length > 0) {
      const categories = await this.prisma.productCategory.findMany({
        where: {
          id: { in: categoryIds },
          isDeleted: false,
        },
      });

      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('بعض الفئات المحددة غير موجودة');
      }
    }

    const productData = { ...createProductDto };
    delete productData.categoryIds;

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        purchasePrice: createProductDto.purchasePrice
          ? createProductDto.purchasePrice
          : null,
        salePrice: createProductDto.salePrice
          ? createProductDto.salePrice
          : null,
        minStockAlert: createProductDto.minStockAlert
          ? createProductDto.minStockAlert
          : null,
        imageUrl,
        categories:
          categoryIds && categoryIds.length > 0
            ? {
                create: categoryIds.map((categoryId) => ({
                  categoryId,
                })),
              }
            : undefined,
      },
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
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return new Product({
      ...product,
      salesUnit: product.salesUnit
        ? new Unit({
            ...product.salesUnit,
            ratio: Number(product.salesUnit.ratio),
          })
        : undefined,
      purchaseUnit: product.purchaseUnit
        ? new Unit({
            ...product.purchaseUnit,
            ratio: Number(product.purchaseUnit.ratio),
          })
        : undefined,
      purchasePrice: product.purchasePrice
        ? Number(product.purchasePrice)
        : null,
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      minStockAlert: product.minStockAlert
        ? Number(product.minStockAlert)
        : null,
      categories: product.categories?.map((pcr) => pcr.category) || [],
    });
  }

  async findAll(queryDto: ProductQueryDto) {
    const {
      search,
      page = 1,
      limit = 10,
      unitId,
      type,
      isActive,
      isDeleted = false,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (unitId) {
      where.OR = [{ salesUnitId: unitId }, { purchaseUnitId: unitId }];
    }

    if (type) {
      where.type = type;
    }

    if (isActive) {
      where.isActive = isActive === 'true' ? true : false;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
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
          categories: {
            include: {
              category: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const transformedProducts = products.map(
      (product) =>
        new Product({
          ...product,
          salesUnit: product.salesUnit
            ? new Unit({
                ...product.salesUnit,
                ratio: Number(product.salesUnit.ratio),
              })
            : undefined,
          purchaseUnit: product.purchaseUnit
            ? new Unit({
                ...product.purchaseUnit,
                ratio: Number(product.purchaseUnit.ratio),
              })
            : undefined,
          purchasePrice: product.purchasePrice
            ? Number(product.purchasePrice)
            : null,
          salePrice: product.salePrice ? Number(product.salePrice) : null,
          minStockAlert: product.minStockAlert
            ? Number(product.minStockAlert)
            : null,
          categories: product.categories?.map((pcr) => pcr.category) || [],
        }),
    );

    return {
      data: transformedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
      },
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
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    return new Product({
      ...product,
      salesUnit: product.salesUnit
        ? new Unit({
            ...product.salesUnit,
            ratio: Number(product.salesUnit.ratio),
          })
        : undefined,
      purchaseUnit: product.purchaseUnit
        ? new Unit({
            ...product.purchaseUnit,
            ratio: Number(product.purchaseUnit.ratio),
          })
        : undefined,
      purchasePrice: product.purchasePrice
        ? Number(product.purchasePrice)
        : null,
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      minStockAlert: product.minStockAlert
        ? Number(product.minStockAlert)
        : null,
      categories: product.categories?.map((pcr) => pcr.category) || [],
    });
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    imageFile?: Express.Multer.File,
    uploadedById?: string,
  ): Promise<Product> {
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('المنتج غير موجود');
    }

    // Check if barcode already exists (excluding current product)
    if (updateProductDto.barcode) {
      const duplicateProduct = await this.prisma.product.findFirst({
        where: {
          barcode: updateProductDto.barcode,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateProduct) {
        throw new ConflictException('الباركود موجود بالفعل');
      }
    }

    // Check if sales unit exists
    if (updateProductDto.salesUnitId) {
      const salesUnit = await this.prisma.unit.findFirst({
        where: {
          id: updateProductDto.salesUnitId,
          isDeleted: false,
          isActive: true,
        },
      });

      if (!salesUnit) {
        throw new NotFoundException('وحدة البيع غير موجودة أو غير نشطة');
      }
    }

    // Check if purchase unit exists
    if (updateProductDto.purchaseUnitId) {
      const purchaseUnit = await this.prisma.unit.findFirst({
        where: {
          id: updateProductDto.purchaseUnitId,
          isDeleted: false,
          isActive: true,
        },
      });

      if (!purchaseUnit) {
        throw new NotFoundException('وحدة الشراء غير موجودة أو غير نشطة');
      }
    }

    // Validate categories if provided
    const categoryIds = updateProductDto.categoryIds;
    if (categoryIds && categoryIds.length > 0) {
      const categories = await this.prisma.productCategory.findMany({
        where: {
          id: { in: categoryIds },
          isDeleted: false,
        },
      });

      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('بعض الفئات المحددة غير موجودة');
      }
    }

    // Handle image upload if provided
    let imageUrl: string | undefined = undefined;
    if (imageFile) {
      try {
        // Compress the image
        const compressedBuffer = await compressImage(imageFile.buffer);

        // Create a new file object with compressed buffer
        const compressedFile: Express.Multer.File = {
          ...imageFile,
          buffer: compressedBuffer,
          size: compressedBuffer.length,
        };

        // Use uploadedById if available, otherwise use 'system'
        const userId = uploadedById || 'system';

        // Upload new image to R2
        const uploadedFile = await this.filesService.uploadFile(
          compressedFile,
          userId,
        );

        imageUrl = uploadedFile.url;

        // Delete old image if it exists
        if (existingProduct.imageUrl) {
          try {
            // Extract file ID from URL or key and delete
            // Note: Since we're using FilesService.uploadFile which creates a DB record,
            // we'd need to query and delete by URL. For now, we'll skip cleanup
            // to avoid breaking changes. Consider adding a deleteByUrl method to FilesService
          } catch (error) {
            console.error('Failed to delete old product image:', error);
          }
        }
      } catch (error) {
        console.error('Failed to upload product image:', error);
      }
    }

    const productData = { ...updateProductDto };
    delete productData.categoryIds;

    // Handle category updates
    const categoryUpdateData: any = {};
    if (categoryIds !== undefined) {
      // Delete existing category relations
      await this.prisma.productCategoryRelation.deleteMany({
        where: { productId: id },
      });

      // Create new category relations if provided
      if (categoryIds.length > 0) {
        categoryUpdateData.categories = {
          create: categoryIds.map((categoryId) => ({
            categoryId,
          })),
        };
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        purchasePrice: updateProductDto.purchasePrice
          ? updateProductDto.purchasePrice
          : null,
        salePrice: updateProductDto.salePrice
          ? updateProductDto.salePrice
          : null,
        minStockAlert: updateProductDto.minStockAlert
          ? updateProductDto.minStockAlert
          : null,
        ...(imageUrl !== undefined && { imageUrl }),
        ...categoryUpdateData,
      },
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
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return new Product({
      ...updatedProduct,
      salesUnit: updatedProduct.salesUnit
        ? new Unit({
            ...updatedProduct.salesUnit,
            ratio: Number(updatedProduct.salesUnit.ratio),
          })
        : undefined,
      purchaseUnit: updatedProduct.purchaseUnit
        ? new Unit({
            ...updatedProduct.purchaseUnit,
            ratio: Number(updatedProduct.purchaseUnit.ratio),
          })
        : undefined,
      purchasePrice: updatedProduct.purchasePrice
        ? Number(updatedProduct.purchasePrice)
        : null,
      salePrice: updatedProduct.salePrice
        ? Number(updatedProduct.salePrice)
        : null,
      minStockAlert: updatedProduct.minStockAlert
        ? Number(updatedProduct.minStockAlert)
        : null,
      categories: updatedProduct.categories?.map((pcr) => pcr.category) || [],
    });
  }

  async remove(id: number): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    // Check if product is used in stock
    const stockCount = await this.prisma.stock.count({
      where: {
        productId: id,
      },
    });

    if (stockCount > 0) {
      throw new ConflictException('لا يمكن حذف المنتج لأنه مستخدم في المخزون');
    }

    // Check if product is used in transactions
    const transactionCount = await this.prisma.warehouseTransaction.count({
      where: {
        items: {
          some: {
            productId: id,
          },
        },
      },
    });

    if (transactionCount > 0) {
      throw new ConflictException('لا يمكن حذف المنتج لأنه مستخدم في الحركات');
    }

    await this.prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getProductStatistics() {
    const [
      totalProducts,
      activeProducts,
      inactiveProducts,
      deletedProducts,
      physicalProducts,
      serviceProducts,
    ] = await Promise.all([
      this.prisma.product.count({ where: { isDeleted: false } }),
      this.prisma.product.count({
        where: { isActive: true, isDeleted: false },
      }),
      this.prisma.product.count({
        where: { isActive: false, isDeleted: false },
      }),
      this.prisma.product.count({ where: { isDeleted: true } }),
      this.prisma.product.count({
        where: { type: 'PRODUCT', isDeleted: false },
      }),
      this.prisma.product.count({
        where: { type: 'SERVICE', isDeleted: false },
      }),
    ]);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      deletedProducts,
      physicalProducts,
      serviceProducts,
    };
  }

  async findByBarcode(barcode: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: {
        barcode,
        isDeleted: false,
      },
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

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    return new Product({
      ...product,
      salesUnit: product.salesUnit
        ? new Unit({
            ...product.salesUnit,
            ratio: Number(product.salesUnit.ratio),
          })
        : undefined,
      purchaseUnit: product.purchaseUnit
        ? new Unit({
            ...product.purchaseUnit,
            ratio: Number(product.purchaseUnit.ratio),
          })
        : undefined,
      purchasePrice: product.purchasePrice
        ? Number(product.purchasePrice)
        : null,
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      minStockAlert: product.minStockAlert
        ? Number(product.minStockAlert)
        : null,
    });
  }

  async getLowStockProducts(limit: number = 10) {
    // Get products with stock levels below their minimum stock alert
    // Only physical products (not services) can have stock
    const products = await this.prisma.product.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        type: 'PRODUCT', // فقط المنتجات الحقيقية، ليس الخدمات
        minStockAlert: { gt: 0 },
      },
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
        stocks: {
          include: {
            warehouse: true,
            trackings: true,
          },
        },
      },
      take: limit,
    });

    // Calculate current stock levels and filter low stock items
    const lowStockProducts = products
      .map((product) => {
        const totalStock = product.stocks.reduce((total, stock) => {
          const stockQuantity = stock.trackings.reduce(
            (trackingTotal, tracking) => {
              return trackingTotal + Number(tracking.quantity);
            },
            0,
          );
          return total + stockQuantity;
        }, 0);

        return {
          ...new Product({
            ...product,
            salesUnit: product.salesUnit
              ? new Unit({
                  ...product.salesUnit,
                  ratio: Number(product.salesUnit.ratio),
                })
              : undefined,
            purchaseUnit: product.purchaseUnit
              ? new Unit({
                  ...product.purchaseUnit,
                  ratio: Number(product.purchaseUnit.ratio),
                })
              : undefined,
            purchasePrice: product.purchasePrice
              ? Number(product.purchasePrice)
              : null,
            salePrice: product.salePrice ? Number(product.salePrice) : null,
            minStockAlert: product.minStockAlert
              ? Number(product.minStockAlert)
              : null,
          }),
          currentStock: totalStock,
          warehouses: product.stocks.map((stock) => ({
            warehouse: stock.warehouse,
            quantity: stock.trackings.reduce(
              (total, tracking) => total + Number(tracking.quantity),
              0,
            ),
          })),
        };
      })
      .filter((product) => product.currentStock < (product.minStockAlert || 0));

    return lowStockProducts;
  }

  async createBulk(
    createProductDtos: CreateProductDto[],
    uploadedById?: string,
  ): Promise<{
    success: Product[];
    failed: { dto: CreateProductDto; error: string }[];
  }> {
    const success: Product[] = [];
    const failed: { dto: CreateProductDto; error: string }[] = [];

    for (const dto of createProductDtos) {
      try {
        const product = await this.create(dto, undefined, uploadedById);
        success.push(product);
      } catch (error) {
        failed.push({
          dto,
          error: error.message || 'خطأ غير معروف',
        });
      }
    }

    return { success, failed };
  }
}
