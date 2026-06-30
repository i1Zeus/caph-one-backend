import { Test, TestingModule } from '@nestjs/testing';
import { PosAnalyticsController } from './pos-analytics.controller';
import { PosAnalyticsService } from './pos-analytics.service';

describe('PosAnalyticsController', () => {
  let controller: PosAnalyticsController;
  let service: PosAnalyticsService;

  const mockAnalyticsService = {
    getTopProducts: jest.fn(),
    getTopEmployees: jest.fn(),
    getEmployeeSalesBreakdown: jest.fn(),
    getProductSalesTable: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PosAnalyticsController],
      providers: [
        {
          provide: PosAnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<PosAnalyticsController>(PosAnalyticsController);
    service = module.get<PosAnalyticsService>(PosAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopProducts', () => {
    it('should call service and return top products', async () => {
      const mockResult = [
        {
          productId: 1,
          productName: 'Product A',
          productBarcode: 'BAR001',
          totalQuantity: 100,
          totalRevenue: 10000,
          averagePrice: 100,
        },
      ];

      mockAnalyticsService.getTopProducts.mockResolvedValue(mockResult);

      const query = { limit: 10 };
      const result = await controller.getTopProducts(query);

      expect(service.getTopProducts).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getTopEmployees', () => {
    it('should call service and return top employees', async () => {
      const mockResult = [
        {
          employeeId: 'emp1',
          employeeName: 'John Doe',
          totalSales: 10000,
          transactionCount: 50,
          averageTransactionValue: 200,
        },
      ];

      mockAnalyticsService.getTopEmployees.mockResolvedValue(mockResult);

      const query = { limit: 10 };
      const result = await controller.getTopEmployees(query);

      expect(service.getTopEmployees).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getEmployeeSalesBreakdown', () => {
    it('should call service and return employee sales breakdown', async () => {
      const mockResult = [
        {
          employeeId: 'emp1',
          employeeName: 'John Doe',
          totalSales: 10000,
          transactionCount: 50,
          averageTransactionValue: 200,
        },
        {
          employeeId: 'emp2',
          employeeName: 'Jane Smith',
          totalSales: 8000,
          transactionCount: 40,
          averageTransactionValue: 200,
        },
      ];

      mockAnalyticsService.getEmployeeSalesBreakdown.mockResolvedValue(
        mockResult,
      );

      const query = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const result = await controller.getEmployeeSalesBreakdown(query);

      expect(service.getEmployeeSalesBreakdown).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getProductSalesTable', () => {
    it('should call service and return product sales table', async () => {
      const mockResult = [
        {
          productId: 1,
          productName: 'Product A',
          productBarcode: 'BAR001',
          salePrice: 100,
          purchasePrice: 60,
          totalQuantitySold: 100,
          totalRevenue: 10000,
          totalCost: 6000,
          grossProfit: 4000,
          profitMargin: 40,
        },
      ];

      mockAnalyticsService.getProductSalesTable.mockResolvedValue(mockResult);

      const query = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const result = await controller.getProductSalesTable(query);

      expect(service.getProductSalesTable).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });
});
