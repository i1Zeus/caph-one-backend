import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CloseSessionDto, OpenSessionDto, SessionQueryDto } from './dto';
import { SessionSummary } from './entities';

@Injectable()
export class PosSessionsService {
  constructor(private prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  /**
   * Open a new POS session
   */
  async openSession(dto: OpenSessionDto) {
    // Check if POS terminal exists and is active
    const pos = await this.tenantPrisma.client.pOS.findUnique({
      where: { id: dto.posId },
    });

    if (!pos || pos.isDeleted) {
      throw new NotFoundException('POS terminal not found');
    }

    if (!pos.isActive) {
      throw new BadRequestException('POS terminal is inactive');
    }

    // Check if employee exists and has POS access
    const employee = await this.tenantPrisma.client.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee || employee.isDeleted) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.hasPOSAccess) {
      throw new BadRequestException('Employee does not have POS access');
    }

    // Check if there's already an open session for this POS
    const existingSession = await this.tenantPrisma.client.pOSSession.findFirst({
      where: {
        posId: dto.posId,
        status: 'OPEN',
        isDeleted: false,
      },
    });

    if (existingSession) {
      throw new BadRequestException('POS terminal already has an open session');
    }

    // Generate session number by counting existing sessions for this POS terminal
    const sessionCount = await this.tenantPrisma.client.pOSSession.count({
      where: {
        posId: dto.posId,
        isDeleted: false,
      },
    });

    const sessionNumber = (sessionCount + 1).toString().padStart(3, '0');

    // Create new session
    const session = await this.tenantPrisma.client.pOSSession.create({
      data: {
        posId: dto.posId,
        employeeId: dto.employeeId,
        sessionNumber,
        openingBalance: new Decimal(dto.openingBalance),
        openingNotes: dto.openingNotes,
        status: 'OPEN',
      },
      include: {
        pos: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return session;
  }

  /**
   * Close a POS session
   */
  async closeSession(sessionId: number, dto: CloseSessionDto) {
    const session = await this.tenantPrisma.client.pOSSession.findUnique({
      where: { id: sessionId },
      include: {
        invoices: {
          where: { isDeleted: false },
        },
      },
    });

    if (!session || session.isDeleted) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'OPEN') {
      throw new BadRequestException('Session is not open');
    }

    // Calculate expected cash from cash transactions
    const cashInvoices = session.invoices.filter(
      (inv) => inv.paymentType === 'CASH',
    );
    const expectedCash = cashInvoices.reduce(
      (sum, inv) => sum + Number(inv.paidAmount),
      Number(session.openingBalance),
    );

    const cashDifference = dto.closingBalance - expectedCash;

    // Update session
    const closedSession = await this.tenantPrisma.client.pOSSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingBalance: new Decimal(dto.closingBalance),
        expectedCash: new Decimal(expectedCash),
        cashDifference: new Decimal(cashDifference),
        closingNotes: dto.closingNotes,
      },
      include: {
        pos: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return closedSession;
  }

  /**
   * Get active session for a POS terminal
   */
  async getActiveSession(posId: number) {
    const session = await this.tenantPrisma.client.pOSSession.findFirst({
      where: {
        posId,
        status: 'OPEN',
        isDeleted: false,
      },
      include: {
        pos: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return session;
  }

  /**
   * Get session details by ID
   */
  async getSession(sessionId: number) {
    const session = await this.tenantPrisma.client.pOSSession.findUnique({
      where: { id: sessionId },
      include: {
        pos: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        invoices: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.isDeleted) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  /**
   * Get session summary with payment breakdown
   */
  async getSessionSummary(sessionId: number): Promise<SessionSummary> {
    const session = await this.getSession(sessionId);

    // Calculate payment breakdown from invoices
    const paymentBreakdown = session.invoices.reduce(
      (acc, invoice) => {
        const paidAmount = Number(invoice.paidAmount);
        const totalAmount = Number(invoice.totalAmount);

        if (invoice.paymentType === 'CASH') {
          acc.cash += paidAmount;
        } else if (invoice.paymentType === 'CARD') {
          acc.card += paidAmount;
        } else if (invoice.paymentType === 'BANK_TRANSFER') {
          acc.bankTransfer += paidAmount;
        } else if (invoice.paymentType === 'CREDIT') {
          acc.credit += paidAmount;
          // حساب المبلغ المتبقي من الآجل
          acc.creditRemaining += totalAmount - paidAmount;
        }
        return acc;
      },
      { cash: 0, card: 0, bankTransfer: 0, credit: 0, creditRemaining: 0 },
    );

    return {
      sessionId: session.id,
      posId: session.posId,
      posName: session.pos.name,
      employeeId: session.employeeId,
      employeeName:
        `${session.employee.firstName} ${session.employee.lastName || ''}`.trim(),
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      status: session.status,
      openingBalance: Number(session.openingBalance),
      closingBalance: session.closingBalance
        ? Number(session.closingBalance)
        : undefined,
      expectedCash: session.expectedCash
        ? Number(session.expectedCash)
        : undefined,
      cashDifference: session.cashDifference
        ? Number(session.cashDifference)
        : undefined,
      totalSales: Number(session.totalSales),
      totalTransactions: session.totalTransactions,
      paymentBreakdown,
      openingNotes: session.openingNotes,
      closingNotes: session.closingNotes,
    };
  }

  /**
   * Get filter options for sessions
   */
  async getSessionFilterOptions() {
    const [terminals, employees] = await Promise.all([
      this.tenantPrisma.client.pOS.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.tenantPrisma.client.employee.findMany({
        where: {
          isDeleted: false,
          hasPOSAccess: true,
          employmentStatus: 'ACTIVE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
        orderBy: { firstName: 'asc' },
      }),
    ]);

    return {
      terminals,
      employees,
      statuses: [
        { value: 'OPEN', label: 'OPEN' },
        { value: 'CLOSED', label: 'CLOSED' },
        { value: 'SUSPENDED', label: 'SUSPENDED' },
      ],
    };
  }

  /**
   * Get session history with filters
   */
  async getSessionHistory(filters: SessionQueryDto) {
    const {
      page = 1,
      limit = 20,
      posId,
      employeeId,
      status,
      search,
      startDate,
      endDate,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (posId) where.posId = posId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    // Date filtering
    if (startDate || endDate) {
      where.openedAt = {};
      if (startDate) {
        where.openedAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.openedAt.lte = endDateTime;
      }
    }

    // Search functionality
    if (search) {
      const searchConditions: any[] = [];

      // Search by session ID if search is a number
      if (!isNaN(Number(search))) {
        searchConditions.push({
          id: Number(search),
        });
      }

      // Search by employee name
      searchConditions.push({
        employee: {
          OR: [
            {
              firstName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        },
      });

      where.OR = searchConditions;
    }

    const [sessions, total] = await Promise.all([
      this.tenantPrisma.client.pOSSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          pos: {
            select: {
              id: true,
              name: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.tenantPrisma.client.pOSSession.count({ where }),
    ]);

    return {
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all invoices from old sessions (excluding a specific session) for a terminal
   */
  async getOldSessionsInvoices(
    posId: number,
    excludeSessionId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    // Get all sessions for this terminal except the excluded one
    const oldSessions = await this.tenantPrisma.client.pOSSession.findMany({
      where: {
        posId,
        id: { not: excludeSessionId },
        isDeleted: false,
      },
      select: { id: true },
    });

    const sessionIds = oldSessions.map((s) => s.id);

    if (sessionIds.length === 0) {
      return {
        invoices: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;
    const where = {
      posSessionId: { in: sessionIds },
      isDeleted: false,
    };

    // Get all invoices from these sessions with full details
    const [invoices, total] = await Promise.all([
      this.tenantPrisma.client.salesInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              type: true,
            },
          },
          currency: {
            select: {
              id: true,
              name: true,
              code: true,
              symbol: true,
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
                  symbol: true,
                },
              },
            },
          },
          returnInvoices: {
            where: {
              isDeleted: false,
            },
            select: {
              id: true,
              totalAmount: true,
            },
          },
          posSession: {
            select: {
              id: true,
              posId: true,
            },
          },
        },
      }),
      this.tenantPrisma.client.salesInvoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all invoices for a specific session with full details
   */
  async getSessionInvoices(
    sessionId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    // Verify session exists
    const session = await this.tenantPrisma.client.pOSSession.findUnique({
      where: { id: sessionId },
      select: { id: true, isDeleted: true },
    });

    if (!session || session.isDeleted) {
      throw new NotFoundException('Session not found');
    }

    const skip = (page - 1) * limit;
    const where = {
      posSessionId: sessionId,
      isDeleted: false,
    };

    // Get all invoices for this session with full details
    const [invoices, total] = await Promise.all([
      this.tenantPrisma.client.salesInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              type: true,
            },
          },
          currency: {
            select: {
              id: true,
              name: true,
              code: true,
              symbol: true,
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
                  symbol: true,
                },
              },
            },
          },
          returnInvoices: {
            where: {
              isDeleted: false,
            },
            include: {
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
                      symbol: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.tenantPrisma.client.salesInvoice.count({ where }),
    ]);

    // Calculate totals from all invoices (not just current page)
    const allInvoices = await this.tenantPrisma.client.salesInvoice.findMany({
      where,
      select: {
        totalAmount: true,
        paidAmount: true,
      },
    });

    return {
      sessionId,
      invoices,
      totalAmount: allInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0,
      ),
      totalPaid: allInvoices.reduce(
        (sum, inv) => sum + Number(inv.paidAmount),
        0,
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
