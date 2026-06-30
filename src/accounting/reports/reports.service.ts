import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AccountStatementFilterDto,
  ClientStatementFilterDto,
  GeneralLedgerFilterDto,
  IncomeStatementFilterDto,
  JournalEntryFilterDto,
  PaymentsReportFilterDto,
  ReceiptsReportFilterDto,
  TrialBalanceFilterDto,
  UnpaidClientsFilterDto,
} from './dto';
import {
  AccountStatementEntry,
  AccountStatementResponse,
  AccountStatementSummary,
  AccountSummary,
  ClientStatementEntry,
  ClientStatementResponse,
  ClientStatementSummary,
  GeneralLedgerEntry,
  GeneralLedgerResponse,
  GeneralLedgerSummary,
  IncomeStatementAccountLine,
  IncomeStatementResponse,
  IncomeStatementSection,
  IncomeStatementSummary,
  JournalEntry,
  JournalEntryResponse,
  JournalEntrySummary,
  JournalTransactionLine,
  PaymentReportEntry,
  PaymentsReportResponse,
  PaymentsReportSummary,
  ReceiptReportEntry,
  ReceiptsReportResponse,
  ReceiptsReportSummary,
  TrialBalanceEntry,
  TrialBalanceResponse,
  TrialBalanceSummary,
  UnpaidClientEntry,
  UnpaidClientsResponse,
  UnpaidClientsSummary,
} from './entities';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate account balance using double-entry accounting principles
   * حساب رصيد الحساب وفق مبادئ المحاسبة ذات القيد المزدوج
   */
  private calculateAccountBalance(
    totalDebit: number,
    totalCredit: number,
    accountType: AccountType,
  ): number {
    // حسابات الأصول والمصروفات: طبيعة مدينة (تزداد بالمدين وتقل بالدائن)
    // Assets and Expenses: Debit nature
    if (
      accountType === AccountType.ASSET ||
      accountType === AccountType.EXPENSE
    ) {
      return totalDebit - totalCredit;
    }
    // حسابات الخصوم وحقوق الملكية والإيرادات: طبيعة دائنة
    // Liabilities, Equity, and Revenue: Credit nature
    else if (
      accountType === AccountType.LIABILITY ||
      accountType === AccountType.EQUITY ||
      accountType === AccountType.REVENUE
    ) {
      return totalCredit - totalDebit;
    }

    return 0;
  }

  /**
   * Generate General Ledger Report - تقرير سجل الاستاذ العام
   * This report shows all transactions in a simple list
   */
  async getGeneralLedger(
    filters: GeneralLedgerFilterDto,
  ): Promise<GeneralLedgerResponse> {
    try {
      this.logger.log(
        'Generating General Ledger report with filters:',
        filters,
      );

      const {
        accountId,
        accountType,
        clientId,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 50,
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause for transactions
      const whereClause: any = {
        isDeleted: false,
      };

      // Date range filter
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) {
          whereClause.date.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.date.lte = new Date(endDate);
        }
      }

      // Client filter
      if (clientId) {
        whereClause.clientId = clientId;
      }

      // Search filter
      if (search) {
        whereClause.OR = [
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // If filtering by account or account type, we need to check the transaction lines
      if (accountId || accountType) {
        const lineWhereClause: any = {
          isDeleted: false,
        };
        if (accountId) {
          lineWhereClause.accountId = accountId;
        }
        if (accountType) {
          lineWhereClause.account = {
            type: accountType,
            isDeleted: false,
          };
        }

        // Get transactions that have lines matching the account filter
        const transactionIds = await this.prisma.transactionLine.findMany({
          where: lineWhereClause,
          select: { transactionId: true },
          distinct: ['transactionId'],
        });

        whereClause.id = {
          in: transactionIds.map((t) => t.transactionId),
        };
      }

      // Get transactions with all related data
      const [transactions, totalCount] = await Promise.all([
        this.prisma.transaction.findMany({
          where: whereClause,
          include: {
            client: true,
            entries: {
              where: {
                isDeleted: false,
              },
              select: {
                debit: true,
                credit: true,
              },
            },
            salesInvoice: {
              select: {
                invoiceNumber: true,
              },
            },
            purchaseInvoice: {
              select: {
                invoiceNumber: true,
              },
            },
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.transaction.count({ where: whereClause }),
      ]);

      // Transform data to general ledger entries (simple transaction list)
      const ledgerEntries: GeneralLedgerEntry[] = transactions.map(
        (transaction) => {
          // Calculate totals for this transaction
          const totalDebit = transaction.entries.reduce(
            (sum, line) => sum + line.debit,
            0,
          );
          const totalCredit = transaction.entries.reduce(
            (sum, line) => sum + line.credit,
            0,
          );

          // Get invoice number if available
          const invoiceNumber =
            transaction.salesInvoice?.invoiceNumber ||
            transaction.purchaseInvoice?.invoiceNumber;

          return {
            id: transaction.id,
            date: transaction.date,
            transactionId: transaction.id,
            description: transaction.description || '',
            accountId: 0,
            accountName: '',
            accountType: 'ASSET' as AccountType,
            debit: totalDebit,
            credit: totalCredit,
            balance: totalDebit - totalCredit,
            clientId: transaction.client?.id,
            clientName: transaction.client?.name,
            currencyCode: 'IQD',
            transactionType: transaction.transactionType,
            invoiceNumber,
            isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
          } as any;
        },
      );

      // Generate summary
      const summary = await this.generateGeneralLedgerSummary(whereClause);

      return {
        data: ledgerEntries as any,
        summary,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        filters: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          accountId,
          accountType,
          clientId,
          search,
        },
      };
    } catch (error) {
      this.logger.error('Error generating General Ledger report:', error);
      throw new BadRequestException('Failed to generate General Ledger report');
    }
  }

  /**
   * Generate General Ledger Summary
   */
  private async generateGeneralLedgerSummary(
    whereClause: any,
  ): Promise<GeneralLedgerSummary> {
    // Get all transactions matching the filter
    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      include: {
        entries: {
          where: {
            isDeleted: false,
          },
          include: {
            account: {
              include: {
                currency: true,
              },
            },
          },
        },
      },
    });

    // Calculate totals
    let totalDebits = 0;
    let totalCredits = 0;
    const accountsMap = new Map<
      number,
      {
        accountId: number;
        accountName: string;
        accountType: AccountType;
        totalDebits: number;
        totalCredits: number;
        transactionCount: number;
        currencyCode?: string;
      }
    >();

    transactions.forEach((transaction) => {
      transaction.entries.forEach((entry) => {
        totalDebits += entry.debit;
        totalCredits += entry.credit;

        const accountId = entry.account.id;
        const existing = accountsMap.get(accountId);

        if (existing) {
          existing.totalDebits += entry.debit;
          existing.totalCredits += entry.credit;
          existing.transactionCount += 1;
        } else {
          accountsMap.set(accountId, {
            accountId: entry.account.id,
            accountName: entry.account.name,
            accountType: entry.account.type,
            totalDebits: entry.debit,
            totalCredits: entry.credit,
            transactionCount: 1,
            currencyCode: entry.account.currency?.code,
          });
        }
      });
    });

    const accountsSummary: AccountSummary[] = Array.from(
      accountsMap.values(),
    ).map((acc) => {
      const balance = this.calculateAccountBalance(
        acc.totalDebits,
        acc.totalCredits,
        acc.accountType,
      );
      return {
        ...acc,
        openingBalance: 0,
        closingBalance: balance,
      };
    });

    return {
      totalTransactions: transactions.length,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      accountsSummary,
    };
  }

  /**
   * Generate Trial Balance Report - تقرير ميزان المراجعة
   */
  async getTrialBalance(
    filters: TrialBalanceFilterDto,
  ): Promise<TrialBalanceResponse> {
    try {
      this.logger.log('Generating Trial Balance report with filters:', filters);

      const {
        startDate,
        endDate,
        accountType,
        showZeroBalances = false,
        showOnlyCashAccounts = false,
      } = filters;

      // Build where clause for accounts
      const accountWhereClause: any = {
        isDeleted: false,
      };

      if (accountType) {
        accountWhereClause.type = accountType;
      }

      if (showOnlyCashAccounts) {
        accountWhereClause.isCash = true;
      }

      // Build where clause for transaction lines
      const transactionLineWhereClause: any = {
        isDeleted: false,
        transaction: {
          isDeleted: false,
        },
      };

      if (startDate || endDate) {
        transactionLineWhereClause.transaction.date = {};
        if (startDate) {
          transactionLineWhereClause.transaction.date.gte = new Date(startDate);
        }
        if (endDate) {
          transactionLineWhereClause.transaction.date.lte = new Date(endDate);
        }
      }

      // Get accounts with their transaction totals
      const accounts = await this.prisma.account.findMany({
        where: accountWhereClause,
        include: {
          currency: true,
          entries: {
            where: transactionLineWhereClause,
            select: {
              debit: true,
              credit: true,
            },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });

      // Transform to trial balance entries
      const trialBalanceEntries: TrialBalanceEntry[] = accounts
        .map((account) => {
          const totalDebits = account.entries.reduce(
            (sum, entry) => sum + entry.debit,
            0,
          );
          const totalCredits = account.entries.reduce(
            (sum, entry) => sum + entry.credit,
            0,
          );
          const balance = this.calculateAccountBalance(
            totalDebits,
            totalCredits,
            account.type,
          );

          return {
            accountId: account.id,
            accountName: account.name,
            accountCode: account.code || undefined,
            accountType: account.type,
            debitBalance: balance > 0 ? balance : 0,
            creditBalance: balance < 0 ? Math.abs(balance) : 0,
            currencyCode: account.currency?.code || 'IQD',
          };
        })
        .filter(
          (entry) =>
            showZeroBalances ||
            entry.debitBalance !== 0 ||
            entry.creditBalance !== 0,
        );

      // Generate summary
      const summary = this.generateTrialBalanceSummary(trialBalanceEntries);

      return {
        data: trialBalanceEntries,
        summary,
        filters: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          accountType,
          showZeroBalances,
          showOnlyCashAccounts,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error generating Trial Balance report:', error);
      throw new BadRequestException('Failed to generate Trial Balance report');
    }
  }

  /**
   * Generate Trial Balance Summary
   */
  private generateTrialBalanceSummary(
    entries: TrialBalanceEntry[],
  ): TrialBalanceSummary {
    const totalDebitBalances = entries.reduce(
      (sum, entry) => sum + entry.debitBalance,
      0,
    );
    const totalCreditBalances = entries.reduce(
      (sum, entry) => sum + entry.creditBalance,
      0,
    );
    const balanceDifference = totalDebitBalances - totalCreditBalances;

    // Group by account type
    const accountsByType = entries.reduce((acc, entry) => {
      if (!acc[entry.accountType]) {
        acc[entry.accountType] = {
          count: 0,
          totalDebits: 0,
          totalCredits: 0,
        };
      }

      acc[entry.accountType].count += 1;
      acc[entry.accountType].totalDebits += entry.debitBalance;
      acc[entry.accountType].totalCredits += entry.creditBalance;

      return acc;
    }, {} as any);

    return {
      totalDebitBalances,
      totalCreditBalances,
      isBalanced: Math.abs(balanceDifference) < 0.01,
      balanceDifference,
      accountsByType,
    };
  }

  /**
   * Generate Account Statement Report - كشف حساب
   */
  async getAccountStatement(
    filters: AccountStatementFilterDto,
  ): Promise<AccountStatementResponse> {
    try {
      this.logger.log(
        'Generating Account Statement report with filters:',
        filters,
      );

      const {
        accountId,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 50,
      } = filters;

      const skip = (page - 1) * limit;

      // Verify account exists
      const account = await this.prisma.account.findUnique({
        where: { id: accountId, isDeleted: false },
        include: { currency: true },
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${accountId} not found`);
      }

      // Build where clause for transaction lines
      const whereClause: any = {
        accountId,
        isDeleted: false,
        transaction: {
          isDeleted: false,
        },
      };

      // Date range filter
      if (startDate || endDate) {
        whereClause.transaction.date = {};
        if (startDate) {
          whereClause.transaction.date.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.transaction.date.lte = new Date(endDate);
        }
      }

      // Search filter
      if (search) {
        whereClause.OR = [
          {
            transaction: {
              description: { contains: search, mode: 'insensitive' },
            },
          },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get opening balance (transactions before startDate)
      let openingBalance = 0;
      if (startDate) {
        const openingBalanceResult =
          await this.prisma.transactionLine.aggregate({
            where: {
              accountId,
              isDeleted: false,
              transaction: {
                isDeleted: false,
                date: { lt: new Date(startDate) },
              },
            },
            _sum: {
              debit: true,
              credit: true,
            },
          });

        const totalDebits = openingBalanceResult._sum.debit || 0;
        const totalCredits = openingBalanceResult._sum.credit || 0;
        openingBalance = this.calculateAccountBalance(
          totalDebits,
          totalCredits,
          account.type,
        );
      }

      // Get transaction lines
      const [transactionLines, totalCount] = await Promise.all([
        this.prisma.transactionLine.findMany({
          where: whereClause,
          include: {
            transaction: {
              include: {
                client: true,
              },
            },
            client: true,
          },
          orderBy: [{ transaction: { date: 'asc' } }, { createdAt: 'asc' }],
          skip,
          take: limit,
        }),
        this.prisma.transactionLine.count({ where: whereClause }),
      ]);

      // Transform to account statement entries with running balance
      let runningBalance = openingBalance;
      const statementEntries: AccountStatementEntry[] = transactionLines.map(
        (line) => {
          const lineBalance = this.calculateAccountBalance(
            line.debit,
            line.credit,
            account.type,
          );
          runningBalance += lineBalance;

          return {
            id: line.id,
            date: line.transaction.date,
            transactionId: line.transaction.id,
            description: line.description || line.transaction.description || '',
            debit: line.debit,
            credit: line.credit,
            balance: lineBalance,
            runningBalance,
            clientId: line.client?.id || line.transaction.client?.id,
            clientName: line.client?.name || line.transaction.client?.name,
          };
        },
      );

      // Calculate totals for the period
      const totalDebits = transactionLines.reduce(
        (sum, line) => sum + line.debit,
        0,
      );
      const totalCredits = transactionLines.reduce(
        (sum, line) => sum + line.credit,
        0,
      );
      const closingBalance =
        openingBalance +
        this.calculateAccountBalance(totalDebits, totalCredits, account.type);

      const summary: AccountStatementSummary = {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currencyCode: account.currency?.code || 'IQD',
        openingBalance,
        totalDebits,
        totalCredits,
        closingBalance,
        transactionCount: totalCount,
        period: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      };

      return {
        data: statementEntries,
        summary,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        filters: {
          accountId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          search,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error generating Account Statement report:', error);
      throw new BadRequestException(
        'Failed to generate Account Statement report',
      );
    }
  }

  /**
   * Generate Client Statement Report - كشف حساب العميل/المورد
   */
  async getClientStatement(
    filters: ClientStatementFilterDto,
  ): Promise<ClientStatementResponse> {
    try {
      this.logger.log(
        'Generating Client Statement report with filters:',
        filters,
      );

      const {
        clientId,
        startDate,
        endDate,
        page = 1,
        limit = 50,
        clientType,
      } = filters;

      const skip = (page - 1) * limit;

      // Verify client exists
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        include: { account: { include: { currency: true } } },
      });

      if (!client) {
        throw new NotFoundException(`Client with ID ${clientId} not found`);
      }

      // Validate client type if specified
      if (clientType && client.type !== clientType) {
        throw new BadRequestException(
          `Client type mismatch. Expected ${clientType}, got ${client.type}`,
        );
      }

      // Build where clause for transaction lines related to this client
      const whereClause: any = {
        isDeleted: false,
        OR: [{ clientId: clientId }, { transaction: { clientId: clientId } }],
        transaction: {
          isDeleted: false,
        },
      };

      // Date range filter
      if (startDate || endDate) {
        whereClause.transaction.date = {};
        if (startDate) {
          whereClause.transaction.date.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.transaction.date.lte = new Date(endDate);
        }
      }

      // Get opening balance (transactions before startDate)
      let openingBalance = 0;
      if (startDate) {
        const openingBalanceResult =
          await this.prisma.transactionLine.aggregate({
            where: {
              OR: [
                { clientId: clientId },
                { transaction: { clientId: clientId } },
              ],
              isDeleted: false,
              transaction: {
                isDeleted: false,
                date: { lt: new Date(startDate) },
              },
            },
            _sum: {
              debit: true,
              credit: true,
            },
          });

        const totalDebits = openingBalanceResult._sum.debit || 0;
        const totalCredits = openingBalanceResult._sum.credit || 0;

        // For customers: debit increases what they owe us, credit decreases it
        // For suppliers: credit increases what we owe them, debit decreases it
        openingBalance =
          client.type === 'CUSTOMER'
            ? totalDebits - totalCredits
            : totalCredits - totalDebits;
      }

      // Get transaction lines with all related data
      const [transactionLines, totalCount] = await Promise.all([
        this.prisma.transactionLine.findMany({
          where: whereClause,
          include: {
            account: {
              include: {
                currency: true,
              },
            },
            transaction: {
              include: {
                client: true,
                salesInvoice: {
                  select: {
                    invoiceNumber: true,
                  },
                },
                purchaseInvoice: {
                  select: {
                    invoiceNumber: true,
                  },
                },
              },
            },
            client: true,
          },
          orderBy: [{ transaction: { date: 'asc' } }, { createdAt: 'asc' }],
          skip,
          take: limit,
        }),
        this.prisma.transactionLine.count({ where: whereClause }),
      ]);

      // Transform to client statement entries with running balance
      let runningBalance = openingBalance;
      const statementEntries: ClientStatementEntry[] = transactionLines.map(
        (line) => {
          // For customers: debit increases balance (they owe us more), credit decreases it (they pay us)
          // For suppliers: credit increases balance (we owe them more), debit decreases it (we pay them)
          const lineBalance =
            client.type === 'CUSTOMER'
              ? line.debit - line.credit
              : line.credit - line.debit;

          runningBalance += lineBalance;

          // Get invoice number if available
          const invoiceNumber =
            line.transaction.salesInvoice?.invoiceNumber ||
            line.transaction.purchaseInvoice?.invoiceNumber;

          return {
            id: line.id,
            date: line.transaction.date,
            transactionId: line.transaction.id,
            transactionType: line.transaction.transactionType,
            description: line.description || line.transaction.description || '',
            invoiceNumber,
            debit: line.debit,
            credit: line.credit,
            balance: lineBalance,
            runningBalance,
            accountId: line.account.id,
            accountName: line.account.name,
            currencyCode: line.account.currency?.code || 'IQD',
          };
        },
      );

      // Calculate totals for the period
      const totalDebits = transactionLines.reduce(
        (sum, line) => sum + line.debit,
        0,
      );
      const totalCredits = transactionLines.reduce(
        (sum, line) => sum + line.credit,
        0,
      );
      const closingBalance =
        openingBalance +
        (client.type === 'CUSTOMER'
          ? totalDebits - totalCredits
          : totalCredits - totalDebits);

      // Get last transaction date
      const lastTransaction = await this.prisma.transactionLine.findFirst({
        where: {
          OR: [{ clientId: clientId }, { transaction: { clientId: clientId } }],
          isDeleted: false,
          transaction: {
            isDeleted: false,
          },
        },
        include: {
          transaction: true,
        },
        orderBy: {
          transaction: {
            date: 'desc',
          },
        },
      });

      const summary: ClientStatementSummary = {
        clientId: client.id,
        clientName: client.name,
        clientType: client.type,
        phone: client.phone,
        address: client.address,
        currencyCode: client.account?.currency?.code || 'IQD',
        openingBalance,
        totalDebits,
        totalCredits,
        closingBalance,
        transactionCount: totalCount,
        lastTransactionDate: lastTransaction?.transaction.date,
        period: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      };

      return {
        data: statementEntries,
        summary,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        filters: {
          clientId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          clientType,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Error generating Client Statement report:', error);
      throw new BadRequestException(
        'Failed to generate Client Statement report',
      );
    }
  }

  /**
   * Get Accounts Summary for Reports
   */
  async getAccountsSummary() {
    try {
      const accounts = await this.prisma.account.findMany({
        where: { isDeleted: false },
        include: {
          currency: true,
          entries: {
            where: {
              transaction: {
                isDeleted: false,
              },
            },
            select: {
              debit: true,
              credit: true,
            },
          },
          _count: {
            select: {
              entries: true,
            },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });

      return accounts.map((account) => {
        const totalDebits = account.entries.reduce(
          (sum, entry) => sum + entry.debit,
          0,
        );
        const totalCredits = account.entries.reduce(
          (sum, entry) => sum + entry.credit,
          0,
        );
        const balance = this.calculateAccountBalance(
          totalDebits,
          totalCredits,
          account.type,
        );

        return {
          id: account.id,
          name: account.name,
          code: account.code,
          type: account.type,
          isCash: account.isCash,
          balance,
          totalDebits,
          totalCredits,
          transactionCount: account._count.entries,
          currencyCode: account.currency?.code || 'IQD',
        };
      });
    } catch (error) {
      this.logger.error('Error getting accounts summary:', error);
      throw new BadRequestException('Failed to get accounts summary');
    }
  }

  /**
   * Generate Journal Entry Report - تقرير دفتر اليومية
   * This report shows all transactions grouped with their transaction lines
   */
  async getJournalEntries(
    filters: JournalEntryFilterDto,
  ): Promise<JournalEntryResponse> {
    try {
      this.logger.log('Generating Journal Entry report with filters:', filters);

      const {
        accountId,
        accountType,
        clientId,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 50,
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause for transactions
      const whereClause: any = {
        isDeleted: false,
      };

      // Date range filter
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) {
          whereClause.date.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.date.lte = new Date(endDate);
        }
      }

      // Client filter
      if (clientId) {
        whereClause.clientId = clientId;
      }

      // Search filter
      if (search) {
        whereClause.OR = [
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // If filtering by account or account type, we need to check the transaction lines
      if (accountId || accountType) {
        const lineWhereClause: any = {
          isDeleted: false,
        };
        if (accountId) {
          lineWhereClause.accountId = accountId;
        }
        if (accountType) {
          lineWhereClause.account = {
            type: accountType,
            isDeleted: false,
          };
        }

        // Get transactions that have lines matching the account filter
        const transactionIds = await this.prisma.transactionLine.findMany({
          where: lineWhereClause,
          select: { transactionId: true },
          distinct: ['transactionId'],
        });

        whereClause.id = {
          in: transactionIds.map((t) => t.transactionId),
        };
      }

      // Get transactions with all related data
      const [transactions, totalCount] = await Promise.all([
        this.prisma.transaction.findMany({
          where: whereClause,
          include: {
            client: true,
            entries: {
              where: {
                isDeleted: false,
              },
              include: {
                account: {
                  include: {
                    currency: true,
                  },
                },
                client: true,
              },
              orderBy: [
                { debit: 'desc' }, // Show debit entries first
                { createdAt: 'asc' },
              ],
            },
            salesInvoice: {
              select: {
                invoiceNumber: true,
              },
            },
            purchaseInvoice: {
              select: {
                invoiceNumber: true,
              },
            },
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.transaction.count({ where: whereClause }),
      ]);

      // Transform data to journal entries
      const journalEntries: JournalEntry[] = transactions.map((transaction) => {
        // Transform transaction lines
        const lines: JournalTransactionLine[] = transaction.entries.map(
          (line) => ({
            id: line.id,
            accountId: line.account.id,
            accountName: line.account.name,
            accountType: line.account.type,
            description: line.description,
            debit: line.debit,
            credit: line.credit,
            clientId: line.client?.id,
            clientName: line.client?.name,
            currencyCode: line.account.currency?.code || 'IQD',
          }),
        );

        // Calculate totals for this transaction
        const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

        // Get invoice number if available
        const invoiceNumber =
          transaction.salesInvoice?.invoiceNumber ||
          transaction.purchaseInvoice?.invoiceNumber;

        return {
          id: transaction.id,
          date: transaction.date,
          description: transaction.description || '',
          transactionType: transaction.transactionType,
          clientId: transaction.client?.id,
          clientName: transaction.client?.name,
          totalDebit,
          totalCredit,
          isBalanced,
          lines,
          invoiceNumber,
        };
      });

      // Generate summary
      const summary = await this.generateJournalEntrySummary(whereClause);

      return {
        data: journalEntries,
        summary,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        filters: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          accountId,
          accountType,
          clientId,
          search,
        },
      };
    } catch (error) {
      this.logger.error('Error generating Journal Entry report:', error);
      throw new BadRequestException('Failed to generate Journal Entry report');
    }
  }

  /**
   * Generate Journal Entry Summary
   */
  private async generateJournalEntrySummary(
    whereClause: any,
  ): Promise<JournalEntrySummary> {
    // Get all transactions matching the filter
    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      include: {
        entries: {
          where: {
            isDeleted: false,
          },
        },
      },
    });

    // Calculate totals
    let totalDebits = 0;
    let totalCredits = 0;
    const transactionsByType: any = {};

    transactions.forEach((transaction) => {
      const transactionDebit = transaction.entries.reduce(
        (sum, line) => sum + line.debit,
        0,
      );
      const transactionCredit = transaction.entries.reduce(
        (sum, line) => sum + line.credit,
        0,
      );

      totalDebits += transactionDebit;
      totalCredits += transactionCredit;

      // Group by transaction type
      const type = transaction.transactionType || 'GENERAL';
      if (!transactionsByType[type]) {
        transactionsByType[type] = {
          count: 0,
          totalDebits: 0,
          totalCredits: 0,
        };
      }

      transactionsByType[type].count += 1;
      transactionsByType[type].totalDebits += transactionDebit;
      transactionsByType[type].totalCredits += transactionCredit;
    });

    return {
      totalTransactions: transactions.length,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      transactionsByType,
    };
  }

  /**
   * Generate Income Statement Report - تقرير الأرباح والخسائر
   * This report shows revenues, expenses, and net income for a period
   */
  async getIncomeStatement(
    filters: IncomeStatementFilterDto,
  ): Promise<IncomeStatementResponse> {
    try {
      this.logger.log(
        'Generating Income Statement report with filters:',
        filters,
      );

      const { startDate, endDate } = filters;

      // Build where clause for transaction lines
      const whereClause: any = {
        isDeleted: false,
        transaction: {
          isDeleted: false,
        },
      };

      // Date range filter
      if (startDate || endDate) {
        whereClause.transaction.date = {};
        if (startDate) {
          whereClause.transaction.date.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.transaction.date.lte = new Date(endDate);
        }
      }

      // Get all revenue accounts (REVENUE type)
      const revenueAccounts = await this.prisma.account.findMany({
        where: {
          type: AccountType.REVENUE,
          isDeleted: false,
        },
        include: {
          entries: {
            where: whereClause,
          },
        },
      });

      // Get all expense accounts (EXPENSE type)
      const expenseAccounts = await this.prisma.account.findMany({
        where: {
          type: AccountType.EXPENSE,
          isDeleted: false,
        },
        include: {
          entries: {
            where: whereClause,
          },
        },
      });

      // Calculate revenue
      const revenueLines: IncomeStatementAccountLine[] = [];
      let totalRevenue = 0;

      for (const account of revenueAccounts) {
        const totalCredit = account.entries.reduce(
          (sum, line) => sum + line.credit,
          0,
        );
        const totalDebit = account.entries.reduce(
          (sum, line) => sum + line.debit,
          0,
        );
        const amount = totalCredit - totalDebit; // Revenue has credit nature

        if (amount !== 0) {
          revenueLines.push({
            accountId: account.id,
            accountName: account.name,
            accountCode: account.code,
            amount,
            percentage: 0, // Will be calculated after we know total
          });
          totalRevenue += amount;
        }
      }

      // Calculate percentages for revenue
      revenueLines.forEach((line) => {
        line.percentage =
          totalRevenue > 0 ? (line.amount / totalRevenue) * 100 : 0;
      });

      // Calculate expenses
      const expenseLines: IncomeStatementAccountLine[] = [];
      let totalExpenses = 0;

      for (const account of expenseAccounts) {
        const totalDebit = account.entries.reduce(
          (sum, line) => sum + line.debit,
          0,
        );
        const totalCredit = account.entries.reduce(
          (sum, line) => sum + line.credit,
          0,
        );
        const amount = totalDebit - totalCredit; // Expenses have debit nature

        if (amount !== 0) {
          expenseLines.push({
            accountId: account.id,
            accountName: account.name,
            accountCode: account.code,
            amount,
            percentage: 0, // Will be calculated after we know total
          });
          totalExpenses += amount;
        }
      }

      // Calculate percentages for expenses (as percentage of revenue)
      expenseLines.forEach((line) => {
        line.percentage =
          totalRevenue > 0 ? (line.amount / totalRevenue) * 100 : 0;
      });

      // Calculate net income
      const netIncome = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

      const revenue: IncomeStatementSection = {
        sectionName: 'الإيرادات',
        accounts: revenueLines.sort((a, b) => b.amount - a.amount),
        total: totalRevenue,
        percentage: 100,
      };

      const expenses: IncomeStatementSection = {
        sectionName: 'المصروفات',
        accounts: expenseLines.sort((a, b) => b.amount - a.amount),
        total: totalExpenses,
        percentage: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
      };

      const summary: IncomeStatementSummary = {
        totalRevenue,
        totalExpenses,
        grossProfit: netIncome, // For simplicity, treating net income as gross profit
        netIncome,
        profitMargin,
      };

      return {
        revenue,
        expenses,
        summary,
        filters: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      };
    } catch (error) {
      this.logger.error('Error generating Income Statement report:', error);
      throw new BadRequestException(
        'Failed to generate Income Statement report',
      );
    }
  }

  /**
   * Generate Receipts Report - تقرير المقبوضات
   */
  async getReceiptsReport(
    filters: ReceiptsReportFilterDto,
  ): Promise<ReceiptsReportResponse> {
    try {
      this.logger.log('Generating Receipts report with filters:', filters);

      const {
        clientId,
        accountId,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 50,
      } = filters;
      const skip = (page - 1) * limit;

      const whereClause: any = {
        isDeleted: false,
        transactionType: 'RECEIPT', // Filter for receipts only
      };

      if (clientId) whereClause.clientId = clientId;

      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = new Date(startDate);
        if (endDate) whereClause.date.lte = new Date(endDate);
      }

      if (search) {
        whereClause.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      // If accountId is specified, filter by transactions that have lines with that account
      if (accountId) {
        whereClause.entries = {
          some: {
            accountId: accountId,
            isDeleted: false,
          },
        };
      }

      const [transactions, totalCount] = await Promise.all([
        this.prisma.transaction.findMany({
          where: whereClause,
          include: {
            client: true,
            entries: {
              where: { isDeleted: false, credit: { gt: 0 } }, // Get credit entries (receipts)
              include: {
                account: { include: { currency: true } },
              },
            },
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.transaction.count({ where: whereClause }),
      ]);

      const data: ReceiptReportEntry[] = [];

      transactions.forEach((transaction) => {
        transaction.entries.forEach((entry) => {
          if (entry.credit > 0) {
            data.push({
              id: entry.id,
              date: transaction.date,
              receiptNumber: `RCP-${transaction.id}`,
              clientId: transaction.client?.id,
              clientName: transaction.client?.name,
              accountId: entry.account.id,
              accountName: entry.account.name,
              amount: entry.credit,
              description: entry.description || transaction.description,
              currencyCode: entry.account.currency?.code || 'IQD',
            });
          }
        });
      });

      // Generate summary
      const totalAmount = data.reduce((sum, r) => sum + r.amount, 0);
      const receiptsByAccount: Record<string, any> = {};

      data.forEach((receipt) => {
        if (!receiptsByAccount[receipt.accountId]) {
          receiptsByAccount[receipt.accountId] = {
            accountName: receipt.accountName,
            count: 0,
            totalAmount: 0,
          };
        }
        receiptsByAccount[receipt.accountId].count++;
        receiptsByAccount[receipt.accountId].totalAmount += receipt.amount;
      });

      const summary: ReceiptsReportSummary = {
        totalReceipts: data.length,
        totalAmount,
        receiptsByAccount,
      };

      return {
        data,
        summary,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        filters: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          clientId,
          accountId,
          search,
        },
      };
    } catch (error) {
      this.logger.error('Error generating Receipts report:', error);
      throw new BadRequestException('Failed to generate Receipts report');
    }
  }

  /**
   * Generate Payments Report - تقرير المدفوعات
   */
  async getPaymentsReport(
    filters: PaymentsReportFilterDto,
  ): Promise<PaymentsReportResponse> {
    try {
      this.logger.log('Generating Payments report with filters:', filters);

      const {
        clientId,
        accountId,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 50,
      } = filters;
      const skip = (page - 1) * limit;

      const whereClause: any = {
        isDeleted: false,
        transactionType: 'PAYMENT', // Filter for payments only
      };

      if (clientId) whereClause.clientId = clientId;

      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = new Date(startDate);
        if (endDate) whereClause.date.lte = new Date(endDate);
      }

      if (search) {
        whereClause.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      // If accountId is specified, filter by transactions that have lines with that account
      if (accountId) {
        whereClause.entries = {
          some: {
            accountId: accountId,
            isDeleted: false,
          },
        };
      }

      const [transactions, totalCount] = await Promise.all([
        this.prisma.transaction.findMany({
          where: whereClause,
          include: {
            client: true,
            entries: {
              where: { isDeleted: false, debit: { gt: 0 } }, // Get debit entries (payments)
              include: {
                account: { include: { currency: true } },
              },
            },
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.transaction.count({ where: whereClause }),
      ]);

      const data: PaymentReportEntry[] = [];

      transactions.forEach((transaction) => {
        transaction.entries.forEach((entry) => {
          if (entry.debit > 0) {
            data.push({
              id: entry.id,
              date: transaction.date,
              paymentNumber: `PAY-${transaction.id}`,
              clientId: transaction.client?.id,
              clientName: transaction.client?.name,
              accountId: entry.account.id,
              accountName: entry.account.name,
              amount: entry.debit,
              description: entry.description || transaction.description,
              currencyCode: entry.account.currency?.code || 'IQD',
            });
          }
        });
      });

      // Generate summary
      const totalAmount = data.reduce((sum, p) => sum + p.amount, 0);
      const paymentsByAccount: Record<string, any> = {};

      data.forEach((payment) => {
        if (!paymentsByAccount[payment.accountId]) {
          paymentsByAccount[payment.accountId] = {
            accountName: payment.accountName,
            count: 0,
            totalAmount: 0,
          };
        }
        paymentsByAccount[payment.accountId].count++;
        paymentsByAccount[payment.accountId].totalAmount += payment.amount;
      });

      const summary: PaymentsReportSummary = {
        totalPayments: data.length,
        totalAmount,
        paymentsByAccount,
      };

      return {
        data,
        summary,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        filters: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          clientId,
          accountId,
          search,
        },
      };
    } catch (error) {
      this.logger.error('Error generating Payments report:', error);
      throw new BadRequestException('Failed to generate Payments report');
    }
  }

  /**
   * Generate Unpaid Clients Report - تقرير العملاء غير المدفوع
   */
  async getUnpaidClientsReport(
    filters: UnpaidClientsFilterDto,
  ): Promise<UnpaidClientsResponse> {
    try {
      this.logger.log(
        'Generating Unpaid Clients report with filters:',
        filters,
      );

      const { clientType, page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (clientType && clientType !== 'ALL') {
        whereClause.type = clientType;
      }

      const clients = await this.prisma.client.findMany({
        where: whereClause,
        include: {
          salesInvoices: {
            where: { isDeleted: false },
            select: {
              id: true,
              invoiceDate: true,
              totalAmount: true,
              paidAmount: true,
            },
          },
          purchaseInvoices: {
            where: { isDeleted: false },
            select: {
              id: true,
              invoiceDate: true,
              totalAmount: true,
              paidAmount: true,
            },
          },
        },
        skip,
        take: limit,
      });

      const totalClientsCount = await this.prisma.client.count({
        where: whereClause,
      });

      const data: UnpaidClientEntry[] = [];
      let totalCustomers = 0;
      let totalSuppliers = 0;
      let customerOutstanding = 0;
      let supplierOutstanding = 0;

      for (const client of clients) {
        const invoices =
          client.type === 'CUSTOMER'
            ? client.salesInvoices
            : client.purchaseInvoices;

        const totalAmount = invoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount),
          0,
        );
        const paidAmount = invoices.reduce(
          (sum, inv) => sum + Number(inv.paidAmount),
          0,
        );
        const remainingBalance = totalAmount - paidAmount;

        // Only include clients with unpaid balances
        if (remainingBalance > 0) {
          const dates = invoices.map((inv) => inv.invoiceDate);

          const entry: UnpaidClientEntry = {
            clientId: client.id,
            clientName: client.name,
            clientType: client.type,
            totalInvoices: invoices.length,
            totalAmount,
            paidAmount,
            remainingBalance,
            oldestInvoiceDate:
              dates.length > 0
                ? new Date(Math.min(...dates.map((d) => d.getTime())))
                : undefined,
            latestInvoiceDate:
              dates.length > 0
                ? new Date(Math.max(...dates.map((d) => d.getTime())))
                : undefined,
          };

          data.push(entry);

          if (client.type === 'CUSTOMER') {
            totalCustomers++;
            customerOutstanding += remainingBalance;
          } else {
            totalSuppliers++;
            supplierOutstanding += remainingBalance;
          }
        }
      }

      const summary: UnpaidClientsSummary = {
        totalClients: data.length,
        totalCustomers,
        totalSuppliers,
        totalOutstandingAmount: customerOutstanding + supplierOutstanding,
        customerOutstanding,
        supplierOutstanding,
      };

      return {
        data: data.sort((a, b) => b.remainingBalance - a.remainingBalance),
        summary,
        pagination: {
          page,
          limit,
          total: totalClientsCount,
          pages: Math.ceil(totalClientsCount / limit),
        },
        filters: { clientType },
      };
    } catch (error) {
      this.logger.error('Error generating Unpaid Clients report:', error);
      throw new BadRequestException('Failed to generate Unpaid Clients report');
    }
  }
}
