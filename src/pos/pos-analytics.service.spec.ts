import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { PosAnalyticsService } from './pos-analytics.service';

describe('PosAnalyticsService', () => {
  let service: PosAnalyticsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    salesInvoiceItem: {
      findMany: jest.fn(),
    },
    salesInvoice: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosAnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PosAnalyticsService>(PosAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopProducts', () => {
    it('should return top products sorted by revenue', async () => {
      const mockItems = [
        {
          productId: 1,
          quantity: new Decimal(10),
          unitPrice: new Decimal(100),
          product: {
            id: 1,
            name: 'Product A',
            barcode: 'BAR001',
          },
        },
        {
          productId: 2,
          quantity: new Decimal(5),
          unitPrice: new Decimal(200),
          product: {
            id: 2,
            name: 'Product B',
            barcode: 'BAR002',
          },
        },
        {
          productId: 1,
          quantity: new Decimal(5),
          unitPrice: new Decimal(100),
          product: {
            id: 1,
            name: 'Product A',
            barcode: 'BAR001',
          },
        },
      ];

      mockPrismaService.salesInvoiceItem.findMany.mockResolvedValue(mockItems);

      const result = await service.getTopProducts({ limit: 10 });

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe(1);
      expect(result[0].totalQuantity).toBe(15);
      expect(result[0].totalRevenue).toBe(1500);
      expect(result[1].productId).toBe(2);
      expect(result[1].totalQuantity).toBe(5);
      expect(result[1].totalRevenue).toBe(1000);
    });

    it('should apply date filters', async () => {
      mockPrismaService.salesInvoiceItem.findMany.mockResolvedValue([]);

      await service.getTopProducts({
        limit: 10,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(mockPrismaService.salesInvoiceItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({
              invoiceDate: {
                gte: new Date('2024-01-01'),
                lte: new Date('2024-12-31'),
              },
            }),
          }),
        }),
      );
    });

    it('should limit results', async () => {
      const mockItems = Array.from({ length: 20 }, (_, i) => ({
        productId: i + 1,
        quantity: new Decimal(10),
        unitPrice: new Decimal(100),
        product: {
          id: i + 1,
          name: `Product ${i + 1}`,
          barcode: `BAR${i + 1}`,
        },
      }));

      mockPrismaService.salesInvoiceItem.findMany.mockResolvedValue(mockItems);

      const result = await service.getTopProducts({ limit: 5 });

      expect(result).toHaveLength(5);
    });
  });

  describe('getTopEmployees', () => {
    it('should return top employees sorted by total sales', async () => {
      const mockInvoices = [
        {
          cashierId: 'emp1',
          totalAmount: new Decimal(1000),
          cashier: {
            id: 'emp1',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
        {
          cashierId: 'emp2',
          totalAmount: new Decimal(500),
          cashier: {
            id: 'emp2',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
        {
          cashierId: 'emp1',
          totalAmount: new Decimal(500),
          cashier: {
            id: 'emp1',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      mockPrismaService.salesInvoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.getTopEmployees({ limit: 10 });

      expect(result).toHaveLength(2);
      expect(result[0].employeeId).toBe('emp1');
      expect(result[0].totalSales).toBe(1500);
      expect(result[0].transactionCount).toBe(2);
      expect(result[0].averageTransactionValue).toBe(750);
      expect(result[1].employeeId).toBe('emp2');
      expect(result[1].totalSales).toBe(500);
      expect(result[1].transactionCount).toBe(1);
    });

    it('should filter by POS session', async () => {
      mockPrismaService.salesInvoice.findMany.mockResolvedValue([]);

      await service.getTopEmployees({ limit: 10, posSessionId: 1 });

      expect(mockPrismaService.salesInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            posSessionId: 1,
          }),
        }),
      );
    });
  });

  describe('getEmployeeSalesBreakdown', () => {
    it('should return all employees with their sales breakdown', async () => {
      const mockInvoices = [
        {
          cashierId: 'emp1',
          totalAmount: new Decimal(1000),
          cashier: {
            id: 'emp1',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
        {
          cashierId: 'emp2',
          totalAmount: new Decimal(500),
          cashier: {
            id: 'emp2',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
      ];

      mockPrismaService.salesInvoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.getEmployeeSalesBreakdown({});

      expect(result).toHaveLength(2);
      expect(result[0].employeeName).toBe('John Doe');
      expect(result[1].employeeName).toBe('Jane Smith');
    });
  });

  describe('getProductSalesTable', () => {
    it('should return product sales details with profitability metrics', async () => {
      const mockItems = [
        {
          productId: 1,
          quantity: new Decimal(10),
          unitPrice: new Decimal(100),
          product: {
            id: 1,
            name: 'Product A',
            barcode: 'BAR001',
            salePrice: new Decimal(100),
            purchasePrice: new Decimal(60),
          },
        },
        {
          productId: 2,
          quantity: new Decimal(5),
          unitPrice: new Decimal(200),
          product: {
            id: 2,
            name: 'Product B',
            barcode: 'BAR002',
            salePrice: new Decimal(200),
            purchasePrice: null,
          },
        },
      ];

      mockPrismaService.salesInvoiceItem.findMany.mockResolvedValue(mockItems);

      const result = await service.getProductSalesTable({});

      expect(result).toHaveLength(2);

      // Product A with cost data
      expect(result[0].productId).toBe(1);
      expect(result[0].totalQuantitySold).toBe(10);
      expect(result[0].totalRevenue).toBe(1000);
      expect(result[0].totalCost).toBe(600);
      expect(result[0].grossProfit).toBe(400);
      expect(result[0].profitMargin).toBe(40);

      // Product B without cost data
      expect(result[1].productId).toBe(2);
      expect(result[1].totalQuantitySold).toBe(5);
      expect(result[1].totalRevenue).toBe(1000);
      expect(result[1].totalCost).toBeNull();
      expect(result[1].grossProfit).toBeNull();
      expect(result[1].profitMargin).toBeNull();
    });

    it('should exclude return invoices', async () => {
      mockPrismaService.salesInvoiceItem.findMany.mockResolvedValue([]);

      await service.getProductSalesTable({});

      expect(mockPrismaService.salesInvoiceItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({
              isReturn: false,
            }),
          }),
        }),
      );
    });

    it('should filter by POS terminal', async () => {
      mockPrismaService.salesInvoiceItem.findMany.mockResolvedValue([]);

      await service.getProductSalesTable({ posId: 1 });

      expect(mockPrismaService.salesInvoiceItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({
              posSession: {
                posId: 1,
              },
            }),
          }),
        }),
      );
    });
  });
});
