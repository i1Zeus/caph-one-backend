import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products/products.service';
import { StockService } from './stock/stock.service';
import { UnitsService } from './units/units.service';
import { WarehouseTransactionsService } from './warehouse-transactions/warehouse-transactions.service';
import { WarehousesService } from './warehouses/warehouses.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService, private tenantPrisma: TenantPrismaService,
    private readonly productsService: ProductsService,
    private readonly stockService: StockService,
    private readonly unitsService: UnitsService,
    private readonly warehousesService: WarehousesService,
    private readonly warehouseTransactionsService: WarehouseTransactionsService,
  ) {}

  async getSystemInfo() {
    return {
      message: 'نظام إدارة المخازن - معلومات النظام',
      version: '2.0.0',
      status: 'Operational',
      lastUpdated: new Date(),
      modules: {
        products: { status: 'Active', endpoint: '/products' },
        units: { status: 'Active', endpoint: '/units' },
        warehouses: { status: 'Active', endpoint: '/warehouses' },
        stock: { status: 'Active', endpoint: '/stock' },
        transactions: { status: 'Active', endpoint: '/warehouse-transactions' },
      },
      documentation: '/docs',
      contact: 'support@devhouse.iq',
    };
  }

  async getDashboard() {
    const [
      productStats,
      stockStats,
      unitStats,
      warehouseStats,
      transactionStats,
      recentTransactions,
      inventoryAlerts,
    ] = await Promise.all([
      this.productsService.getProductStatistics(),
      this.stockService.getStockStats(),
      this.unitsService.getUnitsStats(),
      this.warehousesService.getWarehousesStats(),
      this.warehouseTransactionsService.getTransactionStats(),
      this.warehouseTransactionsService.findAll({ limit: 5, page: 1 }), // Get recent 5 transactions
      this.stockService.getStockAlerts(),
    ]);

    return {
      overview: {
        totalProducts: productStats.totalProducts,
        activeProducts: productStats.activeProducts,
        totalWarehouses: warehouseStats.totalWarehouses,
        activeWarehouses: warehouseStats.activeWarehouses,
        totalStockQuantity: stockStats.totalQuantity,
        totalStockValue: stockStats.totalValue,
        totalTransactions: transactionStats.totalTransactions,
        totalUnits: unitStats.totalUnits,
        activeUnits: unitStats.activeUnits,
      },
      productSummary: productStats,
      stockSummary: stockStats,
      unitSummary: unitStats,
      warehouseSummary: warehouseStats,
      transactionSummary: transactionStats,
      recentActivity: recentTransactions.data,
      alerts: inventoryAlerts,
      lastUpdated: new Date(),
    };
  }

  async getSystemHealth() {
    const healthStatus: any = {
      status: 'OK',
      timestamp: new Date(),
      database: {
        status: 'OK',
        message: 'Database connection is healthy.',
      },
      services: {
        products: { status: 'OK' },
        stock: { status: 'OK' },
        units: { status: 'OK' },
        warehouses: { status: 'OK' },
        transactions: { status: 'OK' },
      },
    };

    try {
      await this.tenantPrisma.client.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error('Database health check failed', error.stack);
      healthStatus.status = 'DEGRADED';
      healthStatus.database.status = 'ERROR';
      healthStatus.database.message = `Database connection failed: ${error.message}`;
    }

    // You can add more specific checks for each service if needed
    // For now, we assume they are healthy if they can be injected

    return healthStatus;
  }

  async getInventorySummary(period: string = '30d') {
    const { startDate, endDate } = this.getDateRange(period);

    const [
      totalProducts,
      activeProducts,
      totalWarehouses,
      totalStockQuantity,
      totalStockValue,
      totalTransactions,
      transactionsByType,
      topProductsByQuantity,
      topWarehousesByStockValue,
    ] = await Promise.all([
      this.tenantPrisma.client.product.count({ where: { isDeleted: false } }),
      this.tenantPrisma.client.product.count({
        where: { isActive: true, isDeleted: false },
      }),
      this.tenantPrisma.client.warehouse.count({ where: { isDeleted: false } }),
      this.stockService.getStockStats().then((stats) => stats.totalQuantity),
      this.stockService.getStockStats().then((stats) => stats.totalValue),
      this.tenantPrisma.client.warehouseTransaction.count({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.tenantPrisma.client.warehouseTransaction.groupBy({
        by: ['type'],
        _count: {
          id: true,
        },
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.getTopProductsByQuantity(startDate, endDate),
      this.getTopWarehousesByStockValue(),
    ]);

    return {
      period,
      startDate,
      endDate,
      productSummary: {
        totalProducts,
        activeProducts,
      },
      warehouseSummary: {
        totalWarehouses,
      },
      stockSummary: {
        totalStockQuantity,
        totalStockValue,
      },
      transactionSummary: {
        totalTransactions,
        transactionsByType: transactionsByType.map((t) => ({
          type: t.type,
          count: t._count.id,
        })),
      },
      topProductsByQuantity,
      topWarehousesByStockValue,
      lastUpdated: new Date(),
    };
  }

  async getInventoryAlerts() {
    const stockAlerts = await this.stockService.getStockAlerts();

    // Add other types of alerts if needed, e.g., inactive products/warehouses
    const inactiveProducts = await this.tenantPrisma.client.product.count({
      where: {
        isActive: false,
        isDeleted: false,
        // Consider adding a check for products with no stock for a long time
      },
    });

    const inactiveWarehouses = await this.tenantPrisma.client.warehouse.count({
      where: {
        isActive: false,
        isDeleted: false,
      },
    });

    return {
      lowStock: stockAlerts.lowStock,
      outOfStock: stockAlerts.outOfStock,
      nearExpiry: stockAlerts.nearExpiry,
      otherAlerts: {
        inactiveProducts,
        inactiveWarehouses,
      },
      summary: {
        lowStockCount: stockAlerts.summary.lowStockCount,
        outOfStockCount: stockAlerts.summary.outOfStockCount,
        nearExpiryCount: stockAlerts.summary.nearExpiryCount,
        inactiveProductsCount: inactiveProducts,
        inactiveWarehousesCount: inactiveWarehouses,
      },
      lastUpdated: new Date(),
    };
  }

  private getDateRange(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '3m':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default: // Default to 30 days
        startDate.setDate(endDate.getDate() - 30);
        break;
    }
    return { startDate, endDate };
  }

  private async getTopProductsByQuantity(
    startDate: Date,
    endDate: Date,
    limit: number = 5,
  ) {
    const productQuantities =
      await this.tenantPrisma.client.warehouseTransactionItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true,
        },
        where: {
          transaction: {
            date: {
              gte: startDate,
              lte: endDate,
            },
            type: {
              in: ['SALE', 'DISPENSE', 'PURCHASE', 'TRANSFER'], // Consider relevant transaction types
            },
          },
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limit,
      });

    const productIds = productQuantities.map((pq) => pq.productId);
    const products = await this.tenantPrisma.client.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, barcode: true },
    });

    return productQuantities.map((pq) => ({
      product: products.find((p) => p.id === pq.productId),
      totalQuantity: Number(pq._sum.quantity),
    }));
  }

  private async getTopWarehousesByStockValue(limit: number = 5) {
    const warehousesWithStock = await this.tenantPrisma.client.warehouse.findMany({
      where: { isDeleted: false, isActive: true },
      include: {
        stocks: {
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
        },
      },
    });

    const warehouseValues = warehousesWithStock
      .map((warehouse) => {
        let totalValue = 0;
        warehouse.stocks.forEach((stock) => {
          const stockQuantity = stock.trackings.reduce((sum, tracking) => {
            // Assuming base unit conversion is handled by stockService or a common utility
            // For simplicity, directly summing quantities here, but a proper conversion utility is better
            return sum + Number(tracking.quantity);
          }, 0);
          totalValue += stockQuantity * Number(stock.product.salePrice || 0);
        });
        return {
          warehouse: {
            id: warehouse.id,
            name: warehouse.name,
            location: warehouse.location,
          },
          totalValue,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    return warehouseValues;
  }
}
