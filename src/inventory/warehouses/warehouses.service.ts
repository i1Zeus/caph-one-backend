import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseQueryDto } from './dto/warehouse-query.dto';
import { Warehouse } from './entities/warehouse.entity';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(createWarehouseDto: CreateWarehouseDto): Promise<Warehouse> {
    // Note: Department functionality removed as departments are not in current schema
    // if (createWarehouseDto.departmentId) {
    //   const department = await this.tenantPrisma.client.department.findUnique({
    //     where: { id: createWarehouseDto.departmentId },
    //   });
    //   if (!department) {
    //     throw new NotFoundException('القسم غير موجود');
    //   }
    // }

    // التحقق من وجود المخزن الأب إذا تم تحديده
    if (createWarehouseDto.parentId) {
      const parentWarehouse = await this.tenantPrisma.client.warehouse.findUnique({
        where: { id: createWarehouseDto.parentId },
      });

      if (!parentWarehouse) {
        throw new NotFoundException('المخزن الأب غير موجود');
      }
    }

    // التحقق من عدم وجود مخزن بنفس الاسم
    const existingWarehouse = await this.tenantPrisma.client.warehouse.findFirst({
      where: {
        name: createWarehouseDto.name,
        isDeleted: false,
      },
    });

    if (existingWarehouse) {
      throw new ConflictException('اسم المخزن موجود مسبقاً');
    }

    const warehouse = await this.tenantPrisma.client.warehouse.create({
      data: createWarehouseDto,
      include: {
        parent: true,
      },
    });

    return new Warehouse(warehouse);
  }

  async findAll(query: WarehouseQueryDto) {
    const {
      search,
      /* departmentId, */ parentId,
      isActive,
      hasParent,
      page = 1,
      limit = 10,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Note: Department filtering removed as departments are not in current schema
    // if (departmentId) {
    //   where.departmentId = departmentId;
    // }

    if (parentId !== undefined) {
      if (parentId === null) {
        where.parentId = null; // المخازن الرئيسية
      } else {
        where.parentId = parentId; // المخازن الفرعية لمخزن محدد
      }
    }

    if (hasParent !== undefined) {
      if (hasParent) {
        where.parentId = { not: null }; // المخازن الفرعية
      } else {
        where.parentId = null; // المخازن الرئيسية
      }
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [warehouses, total] = await Promise.all([
      this.tenantPrisma.client.warehouse.findMany({
        where,
        include: {
          parent: true,
          _count: {
            select: {
              children: true,
              stocks: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.tenantPrisma.client.warehouse.count({ where }),
    ]);

    return {
      data: warehouses.map((warehouse) => new Warehouse(warehouse)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Warehouse> {
    const warehouse = await this.tenantPrisma.client.warehouse.findFirst({
      where: { id, isDeleted: false },
      include: {
        parent: true,
        children: {
          where: { isDeleted: false },
          include: {
            _count: {
              select: {
                children: true,
                stocks: true,
              },
            },
          },
        },
        _count: {
          select: {
            children: true,
            stocks: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('المخزن غير موجود');
    }

    return new Warehouse(warehouse);
  }

  async update(
    id: number,
    updateWarehouseDto: UpdateWarehouseDto,
  ): Promise<Warehouse> {
    // التحقق من وجود المخزن
    const existingWarehouse = await this.tenantPrisma.client.warehouse.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingWarehouse) {
      throw new NotFoundException('المخزن غير موجود');
    }

    // Note: Department functionality removed as departments are not in current schema
    // if (updateWarehouseDto.departmentId) {
    //   const department = await this.tenantPrisma.client.department.findUnique({
    //     where: { id: updateWarehouseDto.departmentId },
    //   });
    //   if (!department) {
    //     throw new NotFoundException('القسم غير موجود');
    //   }
    // }

    // التحقق من المخزن الأب إذا تم تغييره
    if (updateWarehouseDto.parentId) {
      if (updateWarehouseDto.parentId === id) {
        throw new BadRequestException('لا يمكن أن يكون المخزن أباً لنفسه');
      }

      const parentWarehouse = await this.tenantPrisma.client.warehouse.findUnique({
        where: { id: updateWarehouseDto.parentId },
      });

      if (!parentWarehouse) {
        throw new NotFoundException('المخزن الأب غير موجود');
      }

      // التحقق من عدم إنشاء حلقة في الهيكل الهرمي
      await this.checkCircularReference(id, updateWarehouseDto.parentId);
    }

    // التحقق من الاسم إذا تم تغييره
    if (
      updateWarehouseDto.name &&
      updateWarehouseDto.name !== existingWarehouse.name
    ) {
      const duplicateWarehouse = await this.tenantPrisma.client.warehouse.findFirst({
        where: {
          name: updateWarehouseDto.name,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicateWarehouse) {
        throw new ConflictException('اسم المخزن موجود مسبقاً');
      }
    }

    const warehouse = await this.tenantPrisma.client.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
      include: {
        parent: true,
      },
    });

    return new Warehouse(warehouse);
  }

  async remove(id: number): Promise<void> {
    const warehouse = await this.tenantPrisma.client.warehouse.findFirst({
      where: { id, isDeleted: false },
    });

    if (!warehouse) {
      throw new NotFoundException('المخزن غير موجود');
    }

    // التحقق من وجود مخازن فرعية
    const childrenCount = await this.tenantPrisma.client.warehouse.count({
      where: { parentId: id, isDeleted: false },
    });

    if (childrenCount > 0) {
      throw new ConflictException(
        'لا يمكن حذف المخزن لأنه يحتوي على مخازن فرعية',
      );
    }

    // التحقق من وجود مخزون
    const stocksCount = await this.tenantPrisma.client.stock.count({
      where: { warehouseId: id },
    });

    if (stocksCount > 0) {
      throw new ConflictException('لا يمكن حذف المخزن لأنه يحتوي على مخزون');
    }

    // Soft delete
    await this.tenantPrisma.client.warehouse.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getWarehouseHierarchy(id: number) {
    const warehouse = await this.tenantPrisma.client.warehouse.findFirst({
      where: { id, isDeleted: false },
      include: {
        parent: true,
      },
    });

    if (!warehouse) {
      throw new NotFoundException('المخزن غير موجود');
    }

    // الحصول على جميع المخازن الفرعية (recursive)
    const children = await this.getChildrenRecursive(id);

    return {
      warehouse: new Warehouse(warehouse),
      children,
      totalChildren: children.length,
    };
  }

  async getWarehouseStock(id: number) {
    const warehouse = await this.tenantPrisma.client.warehouse.findFirst({
      where: { id, isDeleted: false },
    });

    if (!warehouse) {
      throw new NotFoundException('المخزن غير موجود');
    }

    const stocks = await this.tenantPrisma.client.stock.findMany({
      where: { warehouseId: id },
      include: {
        product: {
          include: {
            salesUnit: true,
            purchaseUnit: true,
          },
        },
        trackings: {
          where: { isActive: true, isDeleted: false },
          include: { storageUnit: true },
        },
      },
      orderBy: { lastUpdated: 'desc' },
    });

    let totalValue = 0;
    let totalQuantity = 0;

    const stocksWithQuantities = stocks.map((stock) => {
      const stockQuantity = stock.trackings.reduce((sum, tracking) => {
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

      const estimatedValue =
        stockQuantity * Number(stock.product.salePrice || 0);
      totalValue += estimatedValue;
      totalQuantity += stockQuantity;

      return {
        productId: stock.productId,
        productName: stock.product.name,
        productBarcode: stock.product.barcode,
        unitName: stock.product.salesUnit?.name || 'غير محدد',
        quantity: stockQuantity,
        reorderLevel: stock.reorderLevel,
        lastUpdated: stock.lastUpdated,
        estimatedValue,
      };
    });

    return {
      warehouse: new Warehouse(warehouse),
      stocks: stocksWithQuantities,
      totalProducts: stocks.length,
      totalQuantity,
      totalValue,
    };
  }

  async getWarehousesStats() {
    const [
      totalWarehouses,
      activeWarehouses,
      warehousesWithStock,
      mainWarehouses,
      subWarehouses,
    ] = await Promise.all([
      this.tenantPrisma.client.warehouse.count({ where: { isDeleted: false } }),
      this.tenantPrisma.client.warehouse.count({
        where: { isDeleted: false, isActive: true },
      }),
      this.tenantPrisma.client.warehouse.count({
        where: {
          isDeleted: false,
          stocks: {
            some: {},
          },
        },
      }),
      this.tenantPrisma.client.warehouse.count({
        where: { isDeleted: false, parentId: null },
      }),
      this.tenantPrisma.client.warehouse.count({
        where: { isDeleted: false, parentId: { not: null } },
      }),
    ]);

    return {
      totalWarehouses,
      activeWarehouses,
      inactiveWarehouses: totalWarehouses - activeWarehouses,
      warehousesWithStock,
      warehousesWithoutStock: totalWarehouses - warehousesWithStock,
      mainWarehouses,
      subWarehouses,
    };
  }

  private async checkCircularReference(
    warehouseId: number,
    newParentId: number,
  ): Promise<void> {
    let currentParentId = newParentId;
    const visited = new Set<number>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new BadRequestException('لا يمكن إنشاء حلقة في الهيكل الهرمي');
      }

      if (currentParentId === warehouseId) {
        throw new BadRequestException('لا يمكن أن يكون المخزن أباً لنفسه');
      }

      visited.add(currentParentId);

      const parent = await this.tenantPrisma.client.warehouse.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });

      currentParentId = parent?.parentId || 0;
    }
  }

  private async getChildrenRecursive(parentId: number): Promise<Warehouse[]> {
    const children = await this.tenantPrisma.client.warehouse.findMany({
      where: { parentId, isDeleted: false },
      include: {
        _count: {
          select: {
            children: true,
            stocks: true,
          },
        },
      },
    });

    const result: Warehouse[] = [];

    for (const child of children) {
      const childWarehouse = new Warehouse(child);
      result.push(childWarehouse);

      // الحصول على الأطفال بشكل recursive
      const grandChildren = await this.getChildrenRecursive(child.id);
      result.push(...grandChildren);
    }

    return result;
  }

  async createBulk(createWarehouseDtos: CreateWarehouseDto[]): Promise<{
    success: Warehouse[];
    failed: { warehouse: CreateWarehouseDto; error: string }[];
  }> {
    const success: Warehouse[] = [];
    const failed: { warehouse: CreateWarehouseDto; error: string }[] = [];

    for (const dto of createWarehouseDtos) {
      try {
        const warehouse = await this.create(dto);
        success.push(warehouse);
      } catch (error) {
        failed.push({
          warehouse: dto,
          error: error.message || 'خطأ غير معروف',
        });
      }
    }

    return { success, failed };
  }

  async getWarehouseTree() {
    // Get all main warehouses (no parent) and build tree structure
    const mainWarehouses = await this.tenantPrisma.client.warehouse.findMany({
      where: {
        parentId: null,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            children: true,
            stocks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const tree = [];
    for (const warehouse of mainWarehouses) {
      const warehouseWithChildren = await this.buildTreeNode(warehouse.id);
      tree.push(warehouseWithChildren);
    }

    return {
      tree,
      totalMainWarehouses: mainWarehouses.length,
    };
  }

  async getWarehouseLocations() {
    const warehouses = await this.tenantPrisma.client.warehouse.findMany({
      where: {
        isDeleted: false,
        location: { not: null },
      },
      select: {
        id: true,
        name: true,
        location: true,
        parentId: true,
        _count: {
          select: {
            stocks: true,
          },
        },
      },
      orderBy: { location: 'asc' },
    });

    // Group by location
    const locationGroups = warehouses.reduce(
      (groups, warehouse) => {
        const location = warehouse.location!;
        if (!groups[location]) {
          groups[location] = [];
        }
        groups[location].push({
          id: warehouse.id,
          name: warehouse.name,
          parentId: warehouse.parentId,
          stockCount: warehouse._count.stocks,
        });
        return groups;
      },
      {} as Record<string, any[]>,
    );

    return {
      locations: Object.keys(locationGroups).map((location) => ({
        location,
        warehouses: locationGroups[location],
        warehouseCount: locationGroups[location].length,
      })),
      totalLocations: Object.keys(locationGroups).length,
      totalWarehouses: warehouses.length,
    };
  }

  private async buildTreeNode(warehouseId: number): Promise<any> {
    const warehouse = await this.tenantPrisma.client.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        children: {
          where: { isDeleted: false },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            children: true,
            stocks: true,
          },
        },
      },
    });

    if (!warehouse) return null;

    const children = [];
    for (const child of warehouse.children) {
      const childNode = await this.buildTreeNode(child.id);
      if (childNode) children.push(childNode);
    }

    return {
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
      isActive: warehouse.isActive,
      children,
      childrenCount: warehouse._count.children,
      stockCount: warehouse._count.stocks,
    };
  }
}
