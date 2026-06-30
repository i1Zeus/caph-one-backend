import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto';

export interface TopProductResult {
  productId: number;
  productName: string;
  productBarcode: string | null;
  totalQuantity: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface TopEmployeeResult {
  employeeId: string;
  employeeName: string;
  totalSales: number;
  transactionCount: number;
  averageTransactionValue: number;
}

export interface EmployeeSalesBreakdown {
  employeeId: string;
  employeeName: string;
  totalSales: number;
  transactionCount: number;
  averageTransactionValue: number;
}

export interface ProductSalesDetail {
  productId: number;
  productName: string;
  productBarcode: string | null;
  salePrice: number;
  purchasePrice: number | null;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number | null;
  grossProfit: number | null;
  profitMargin: number | null;
}

@Injectable()
export class PosAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get top products by sales volume/revenue
   */
  async getTopProducts(query: AnalyticsQueryDto): Promise<TopProductResult[]> {
    const { limit = 10, startDate, endDate, posSessionId, posId } = query;

    // Build where clause for filtering invoices
    const invoiceWhere: any = {
      isPOS: true,
      isDeleted: false,
      isReturn: false, // Exclude returns from top products
    };

    if (startDate || endDate) {
      invoiceWhere.invoiceDate = {};
      if (startDate) invoiceWhere.invoiceDate.gte = new Date(startDate);
      if (endDate) invoiceWhere.invoiceDate.lte = new Date(endDate);
    }

    if (posSessionId) {
      invoiceWhere.posSessionId = posSessionId;
    }

    if (posId) {
      invoiceWhere.posSession = {
        posId,
      };
    }

    // Get all invoice items matching the criteria
    const items = await this.prisma.salesInvoiceItem.findMany({
      where: {
        invoice: invoiceWhere,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            barcode: true,
          },
        },
      },
    });

    // Aggregate by product
    const productMap = new Map<
      number,
      {
        productId: number;
        productName: string;
        productBarcode: string | null;
        totalQuantity: number;
        totalRevenue: number;
        priceSum: number;
        count: number;
      }
    >();

    for (const item of items) {
      const existing = productMap.get(item.productId);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const revenue = quantity * unitPrice;

      if (existing) {
        existing.totalQuantity += quantity;
        existing.totalRevenue += revenue;
        existing.priceSum += unitPrice;
        existing.count += 1;
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.product.name,
          productBarcode: item.product.barcode,
          totalQuantity: quantity,
          totalRevenue: revenue,
          priceSum: unitPrice,
          count: 1,
        });
      }
    }

    // Convert to array and sort by revenue
    const results: TopProductResult[] = Array.from(productMap.values())
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        productBarcode: p.productBarcode,
        totalQuantity: p.totalQuantity,
        totalRevenue: p.totalRevenue,
        averagePrice: p.priceSum / p.count,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    return results;
  }

  /**
   * Get top employees by sales performance
   */
  async getTopEmployees(
    query: AnalyticsQueryDto,
  ): Promise<TopEmployeeResult[]> {
    const { limit = 10, startDate, endDate, posSessionId, posId } = query;

    // Build where clause
    const where: any = {
      isPOS: true,
      isDeleted: false,
      cashierId: { not: null },
    };

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    if (posSessionId) {
      where.posSessionId = posSessionId;
    }

    if (posId) {
      where.posSession = {
        posId,
      };
    }

    // Get all invoices with cashier info
    const invoices = await this.prisma.salesInvoice.findMany({
      where,
      select: {
        cashierId: true,
        totalAmount: true,
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Aggregate by employee
    const employeeMap = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        totalSales: number;
        transactionCount: number;
      }
    >();

    for (const invoice of invoices) {
      if (!invoice.cashierId || !invoice.cashier) continue;

      const existing = employeeMap.get(invoice.cashierId);
      const amount = Number(invoice.totalAmount);
      const employeeName =
        `${invoice.cashier.firstName} ${invoice.cashier.lastName}`.trim();

      if (existing) {
        existing.totalSales += amount;
        existing.transactionCount += 1;
      } else {
        employeeMap.set(invoice.cashierId, {
          employeeId: invoice.cashierId,
          employeeName,
          totalSales: amount,
          transactionCount: 1,
        });
      }
    }

    // Convert to array and calculate averages
    const results: TopEmployeeResult[] = Array.from(employeeMap.values())
      .map((e) => ({
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        totalSales: e.totalSales,
        transactionCount: e.transactionCount,
        averageTransactionValue: e.totalSales / e.transactionCount,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit);

    return results;
  }

  /**
   * Get sales breakdown for each employee
   */
  async getEmployeeSalesBreakdown(
    query: AnalyticsQueryDto,
  ): Promise<EmployeeSalesBreakdown[]> {
    const { startDate, endDate, posSessionId, posId } = query;

    // Build where clause
    const where: any = {
      isPOS: true,
      isDeleted: false,
      cashierId: { not: null },
    };

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    if (posSessionId) {
      where.posSessionId = posSessionId;
    }

    if (posId) {
      where.posSession = {
        posId,
      };
    }

    // Get all invoices with cashier info
    const invoices = await this.prisma.salesInvoice.findMany({
      where,
      select: {
        cashierId: true,
        totalAmount: true,
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Aggregate by employee
    const employeeMap = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        totalSales: number;
        transactionCount: number;
      }
    >();

    for (const invoice of invoices) {
      if (!invoice.cashierId || !invoice.cashier) continue;

      const existing = employeeMap.get(invoice.cashierId);
      const amount = Number(invoice.totalAmount);
      const employeeName =
        `${invoice.cashier.firstName} ${invoice.cashier.lastName}`.trim();

      if (existing) {
        existing.totalSales += amount;
        existing.transactionCount += 1;
      } else {
        employeeMap.set(invoice.cashierId, {
          employeeId: invoice.cashierId,
          employeeName,
          totalSales: amount,
          transactionCount: 1,
        });
      }
    }

    // Convert to array and calculate averages (all employees, no limit)
    const results: EmployeeSalesBreakdown[] = Array.from(employeeMap.values())
      .map((e) => ({
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        totalSales: e.totalSales,
        transactionCount: e.transactionCount,
        averageTransactionValue: e.totalSales / e.transactionCount,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    return results;
  }

  /**
   * Get detailed product sales table with pricing and profitability
   */
  async getProductSalesTable(
    query: AnalyticsQueryDto,
  ): Promise<ProductSalesDetail[]> {
    const { startDate, endDate, posSessionId, posId } = query;

    // Build where clause for filtering invoices
    const invoiceWhere: any = {
      isPOS: true,
      isDeleted: false,
      isReturn: false, // Exclude returns
    };

    if (startDate || endDate) {
      invoiceWhere.invoiceDate = {};
      if (startDate) invoiceWhere.invoiceDate.gte = new Date(startDate);
      if (endDate) invoiceWhere.invoiceDate.lte = new Date(endDate);
    }

    if (posSessionId) {
      invoiceWhere.posSessionId = posSessionId;
    }

    if (posId) {
      invoiceWhere.posSession = {
        posId,
      };
    }

    // Get all invoice items matching the criteria
    const items = await this.prisma.salesInvoiceItem.findMany({
      where: {
        invoice: invoiceWhere,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            barcode: true,
            salePrice: true,
            purchasePrice: true,
          },
        },
      },
    });

    // Aggregate by product
    const productMap = new Map<
      number,
      {
        productId: number;
        productName: string;
        productBarcode: string | null;
        salePrice: number;
        purchasePrice: number | null;
        totalQuantitySold: number;
        totalRevenue: number;
        totalCost: number | null;
      }
    >();

    for (const item of items) {
      const existing = productMap.get(item.productId);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const revenue = quantity * unitPrice;
      const purchasePrice = item.product.purchasePrice
        ? Number(item.product.purchasePrice)
        : null;
      const cost = purchasePrice !== null ? quantity * purchasePrice : null;

      if (existing) {
        existing.totalQuantitySold += quantity;
        existing.totalRevenue += revenue;
        if (existing.totalCost !== null && cost !== null) {
          existing.totalCost += cost;
        }
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.product.name,
          productBarcode: item.product.barcode,
          salePrice: item.product.salePrice
            ? Number(item.product.salePrice)
            : 0,
          purchasePrice: purchasePrice,
          totalQuantitySold: quantity,
          totalRevenue: revenue,
          totalCost: cost,
        });
      }
    }

    // Convert to array and calculate profitability metrics
    const results: ProductSalesDetail[] = Array.from(productMap.values())
      .map((p) => {
        const grossProfit =
          p.totalCost !== null ? p.totalRevenue - p.totalCost : null;
        const profitMargin =
          grossProfit !== null && p.totalRevenue > 0
            ? (grossProfit / p.totalRevenue) * 100
            : null;

        return {
          productId: p.productId,
          productName: p.productName,
          productBarcode: p.productBarcode,
          salePrice: p.salePrice,
          purchasePrice: p.purchasePrice,
          totalQuantitySold: p.totalQuantitySold,
          totalRevenue: p.totalRevenue,
          totalCost: p.totalCost,
          grossProfit,
          profitMargin,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return results;
  }
}
