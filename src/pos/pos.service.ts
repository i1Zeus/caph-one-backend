import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import { SalesInvoicesService } from '../accounting/sales-invoices/sales-invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePosReturnDto,
  CreatePosTransactionDto,
  PosQueryDto,
} from './dto';
import { POSProduct } from './entities';

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
    @Inject(forwardRef(() => SalesInvoicesService))
    private salesInvoicesService: SalesInvoicesService,
  ) {}

  /**
   * Get products with stock information for POS
   */
  async getProductsForPOS(
    query: PosQueryDto,
  ): Promise<{ data: POSProduct[]; total: number }> {
    const { page = 1, limit = 20, search, warehouseId, categoryId } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      isActive: true,
      type: 'PRODUCT', // Only physical products, not services
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categories = {
        some: {
          categoryId,
          category: {
            isDeleted: false,
            isActive: true,
          },
        },
      };
    }

    const [products, total] = await Promise.all([
      this.tenantPrisma.client.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          salesUnit: true,
          purchaseUnit: true,
          stocks: {
            where: warehouseId ? { warehouseId } : {},
            include: {
              warehouse: true,
              trackings: true,
            },
          },
        },
      }),
      this.tenantPrisma.client.product.count({ where }),
    ]);

    const posProducts: POSProduct[] = products.map((product) => {
      const stock = product.stocks.map((s) => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        availableQuantity: s.trackings.reduce(
          (sum, t) => sum + Number(t.quantity),
          0,
        ),
        trackings: s.trackings.map((t) => ({
          id: t.id,
          quantity: Number(t.quantity),
          expiryDate: t.expiryDate,
          batchNumber: t.batchName,
        })),
      }));

      return {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        salePrice: Number(product.salePrice) || 0,
        purchasePrice: product.purchasePrice
          ? Number(product.purchasePrice)
          : undefined,
        description: product.description,
        type: product.type,
        isActive: product.isActive,
        imageUrl: product.imageUrl,
        salesUnit: product.salesUnit
          ? {
              id: product.salesUnit.id,
              name: product.salesUnit.name,
            }
          : undefined,
        purchaseUnit: product.purchaseUnit
          ? {
              id: product.purchaseUnit.id,
              name: product.purchaseUnit.name,
            }
          : undefined,
        stock,
        totalStock: stock.reduce((sum, s) => sum + s.availableQuantity, 0),
      };
    });

    return { data: posProducts, total };
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(
    barcode: string,
    warehouseId?: number,
  ): Promise<POSProduct> {
    const product = await this.tenantPrisma.client.product.findFirst({
      where: {
        barcode,
        isDeleted: false,
        isActive: true,
      },
      include: {
        salesUnit: true,
        purchaseUnit: true,
        stocks: {
          where: warehouseId ? { warehouseId } : {},
          include: {
            warehouse: true,
            trackings: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const stock = product.stocks.map((s) => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      availableQuantity: s.trackings.reduce(
        (sum, t) => sum + Number(t.quantity),
        0,
      ),
      trackings: s.trackings.map((t) => ({
        id: t.id,
        quantity: Number(t.quantity),
        expiryDate: t.expiryDate,
        batchNumber: t.batchName,
      })),
    }));

    return {
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      salePrice: Number(product.salePrice) || 0,
      purchasePrice: product.purchasePrice
        ? Number(product.purchasePrice)
        : undefined,
      description: product.description,
      type: product.type,
      isActive: product.isActive,
      imageUrl: product.imageUrl,
      salesUnit: product.salesUnit
        ? {
            id: product.salesUnit.id,
            name: product.salesUnit.name,
          }
        : undefined,
      purchaseUnit: product.purchaseUnit
        ? {
            id: product.purchaseUnit.id,
            name: product.purchaseUnit.name,
          }
        : undefined,
      stock,
      totalStock: stock.reduce((sum, s) => sum + s.availableQuantity, 0),
    };
  }

  /**
   * Process POS transaction
   * Creates a sales invoice and updates session totals
   */
  async processTransaction(dto: CreatePosTransactionDto, employeeId: string) {
    // Fetch employee to get their userId
    const employee = await this.tenantPrisma.client.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Verify session exists and is open
    const session = await this.tenantPrisma.client.pOSSession.findUnique({
      where: { id: dto.posSessionId },
      include: { pos: true },
    });

    if (!session || session.isDeleted) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'OPEN') {
      throw new BadRequestException('Session is not open');
    }

    // Allow any authenticated employee to process transactions on an open session
    // Multiple employees can work at the same terminal during the same session

    // Handle payment splits: use payments array if provided, otherwise fall back to legacy single payment
    let paidAmount = 0;
    let paymentType: any = 'CREDIT';

    if (dto.payments && dto.payments.length > 0) {
      // New multi-method payment
      paidAmount = dto.payments.reduce((sum, p) => sum + p.amount, 0);
      paymentType = dto.payments[0].paymentType; // Use first payment type as default
    } else if (dto.paidAmount !== undefined && dto.paymentType) {
      // Legacy single payment
      paidAmount = dto.paidAmount;
      paymentType = dto.paymentType;
    }

    // Create sales invoice using the existing sales invoices service
    const invoice = await this.salesInvoicesService.create(
      {
        clientId: dto.clientId,
        totalAmount: dto.totalAmount,
        paidAmount: paidAmount,
        paymentType: paymentType,
        payments: dto.payments, // Pass payments array if provided
        status: paidAmount >= dto.totalAmount ? 'PAID' : 'PARTIAL',
        description: dto.description || `POS Sale - Session #${session.id}`,
        notes: dto.notes,
        invoiceDate: new Date().toISOString(),
        items: dto.items,
        warehouseId: dto.warehouseId,
        invoiceConfigId: dto.invoiceConfigId,
        discount: dto.discount,
        discountType: dto.discountType,
        // POS-specific fields
        isPOS: true,
        posSessionId: session.id,
        cashierId: employeeId,
        printFormat: dto.printFormat || session.pos.printFormat,
      } as any,
      employee.userId, // Pass the employee's userId (which may be null)
    );

    // Update session totals - use the final discounted totalAmount from the invoice
    await this.tenantPrisma.client.pOSSession.update({
      where: { id: session.id },
      data: {
        totalSales: {
          increment: new Decimal(invoice.totalAmount), // Use discounted total from invoice
        },
        totalTransactions: {
          increment: 1,
        },
      },
    });

    return invoice;
  }

  /**
   * Get transactions for a session
   */
  async getSessionTransactions(sessionId: number) {
    const session = await this.tenantPrisma.client.pOSSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.isDeleted) {
      throw new NotFoundException('Session not found');
    }

    const invoices = await this.tenantPrisma.client.salesInvoice.findMany({
      where: {
        posSessionId: sessionId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: true,
            unit: true,
          },
        },
      },
    });

    return invoices;
  }

  /**
   * Get categories for POS with pagination
   */
  async getCategoriesForPOS(query: PosQueryDto): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      isActive: true,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [categories, total] = await Promise.all([
      this.tenantPrisma.client.productCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: {
              products: {
                where: {
                  product: {
                    isDeleted: false,
                    isActive: true,
                    type: 'PRODUCT',
                  },
                },
              },
            },
          },
        },
      }),
      this.tenantPrisma.client.productCategory.count({ where }),
    ]);

    return {
      data: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        productCount: cat._count.products,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all invoices from a specific terminal (across all sessions) for return selection
   */
  async getTerminalInvoices(posId: number) {
    // Verify terminal exists
    const terminal = await this.tenantPrisma.client.pOS.findUnique({
      where: { id: posId },
    });

    if (!terminal || terminal.isDeleted) {
      throw new NotFoundException('Terminal not found');
    }

    // Get all invoices from this terminal's sessions that are not already returns
    const invoices = await this.tenantPrisma.client.salesInvoice.findMany({
      where: {
        isPOS: true,
        isReturn: false, // Only show original invoices, not returns
        isDeleted: false,
        posSession: {
          posId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            unit: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        posSession: {
          select: {
            id: true,
            posId: true,
          },
        },
      },
    });

    return invoices;
  }

  /**
   * Get invoice details for return processing
   * Validates that the invoice belongs to the specified terminal
   */
  async getInvoiceForReturn(invoiceId: number, posId: number) {
    const invoice = await this.tenantPrisma.client.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
              },
            },
            unit: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        posSession: {
          select: {
            id: true,
            posId: true,
          },
        },
        returnInvoices: {
          where: { isDeleted: false },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, barcode: true } },
                unit: { select: { id: true, name: true, symbol: true } },
              },
            },
          },
        }, // Include any existing returns with their items
      },
    });

    if (!invoice || invoice.isDeleted) {
      throw new NotFoundException('Invoice not found');
    }

    // Verify invoice belongs to the specified terminal
    if (!invoice.posSession || invoice.posSession.posId !== posId) {
      throw new BadRequestException('Invoice does not belong to this terminal');
    }

    // Don't allow returns on return invoices
    if (invoice.isReturn) {
      throw new BadRequestException('Cannot return a return invoice');
    }

    return invoice;
  }

  /**
   * Process a return transaction
   * Creates a return invoice with negative amounts
   */
  async processReturn(dto: CreatePosReturnDto, employeeId: string) {
    // Fetch employee to get their userId
    const employee = await this.tenantPrisma.client.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Verify session exists and is open
    const session = await this.tenantPrisma.client.pOSSession.findUnique({
      where: { id: dto.posSessionId },
      include: { pos: true },
    });

    if (!session || session.isDeleted) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'OPEN') {
      throw new BadRequestException('Session is not open');
    }

    // Allow any authenticated employee to process returns on an open session
    // No need to check if it's the same employee who opened the session

    // Get and validate original invoice
    const originalInvoice = (await this.getInvoiceForReturn(
      dto.originalInvoiceId,
      session.pos.id,
    )) as any;

    // Validate return items against original invoice items
    const originalItemsMap = new Map<any, any>(
      originalInvoice.items.map((item: any) => [item.id, item]),
    );

    for (const returnItem of dto.items) {
      const originalItem = originalItemsMap.get(
        returnItem.originalInvoiceItemId,
      ) as any;

      if (!originalItem) {
        throw new BadRequestException(
          `Original invoice item ${returnItem.originalInvoiceItemId} not found`,
        );
      }

      if (originalItem.productId !== returnItem.productId) {
        throw new BadRequestException('Product ID mismatch');
      }

      // Check that return quantity doesn't exceed original quantity
      const originalQty = Number(originalItem.quantity);
      if (returnItem.quantity > originalQty) {
        throw new BadRequestException(
          `Return quantity (${returnItem.quantity}) exceeds original quantity (${originalQty}) for product ${originalItem.product.name}`,
        );
      }
    }

    // Calculate total return amount (negative)
    const returnItems = dto.items.map((item) => {
      const originalItem = originalItemsMap.get(
        item.originalInvoiceItemId,
      ) as any;
      const unitPrice =
        item.adjustedUnitPrice ?? Number(originalItem.unitPrice);

      return {
        productId: item.productId,
        quantity: -item.quantity, // Negative quantity for return
        unitPrice: unitPrice,
        unitId: item.unitId ?? originalItem.unitId,
        trackingId: item.trackingId,
        toWarehouseId: item.toWarehouseId ?? dto.warehouseId, // Use per-item warehouse or fallback to DTO-level warehouse
      };
    });

    const totalReturnAmount = returnItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // Create return invoice using the sales invoices service
    const returnInvoice = await this.salesInvoicesService.create(
      {
        clientId: dto.clientId ?? originalInvoice.clientId,
        totalAmount: totalReturnAmount, // This will be negative
        paidAmount: totalReturnAmount, // Full refund
        paymentType: dto.paymentType as any,
        status: 'PAID', // Returns are fully paid (refunded)
        description: `Return for Invoice #${originalInvoice.invoiceNumber}`,
        notes: dto.notes,
        invoiceDate: new Date().toISOString(),
        items: returnItems,
        warehouseId: dto.warehouseId,
        invoiceConfigId: dto.invoiceConfigId,
        // Return-specific fields
        isReturn: true,
        originalInvoiceId: dto.originalInvoiceId,
        // POS-specific fields
        isPOS: true,
        posSessionId: session.id,
        cashierId: employeeId,
        printFormat: dto.printFormat || session.pos.printFormat,
      } as any,
      employee.userId,
    );

    // Update session totals - subtract return amount (since it's negative, this decreases totalSales)
    await this.tenantPrisma.client.pOSSession.update({
      where: { id: session.id },
      data: {
        totalSales: {
          increment: new Decimal(returnInvoice.totalAmount), // Negative amount, so it subtracts
        },
        totalTransactions: {
          increment: 1,
        },
      },
    });

    return returnInvoice;
  }
}
