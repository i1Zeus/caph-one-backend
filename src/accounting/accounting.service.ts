import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private readonly prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async getDashboardSummary() {
    try {
      // Get main currency for conversion
      const mainCurrency = await this.tenantPrisma.client.currency.findFirst({
        where: { isMain: true },
      });

      // Get all accounts with their balances
      const accounts = await this.tenantPrisma.client.account.findMany({
        where: { isDeleted: false },
        include: {
          currency: true,
        },
      });

      // Calculate balances for each account
      const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => {
          const balanceResult = await this.tenantPrisma.client.transactionLine.aggregate({
            where: {
              accountId: account.id,
              isDeleted: false, // Filter out soft-deleted transaction lines
              transaction: {
                isDeleted: false,
              },
            },
            _sum: {
              debit: true,
              credit: true,
            },
          });

          const totalDebits = balanceResult._sum.debit || 0;
          const totalCredits = balanceResult._sum.credit || 0;
          const balance = totalDebits - totalCredits;

          return {
            ...account,
            balance,
            totalDebits,
            totalCredits,
          };
        }),
      );

      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTransactions = await this.tenantPrisma.client.transaction.findMany({
        where: {
          date: { gte: thirtyDaysAgo },
          isDeleted: false,
        },
        include: {
          entries: {
            where: { isDeleted: false }, // Filter out soft-deleted entries
            include: {
              account: true,
            },
          },
          client: true,
        },
        orderBy: { date: 'desc' },
        take: 10,
      });

      // Calculate summary by account type
      const assetAccounts = accountsWithBalances.filter(
        (acc) => acc.type === AccountType.ASSET,
      );
      const liabilityAccounts = accountsWithBalances.filter(
        (acc) => acc.type === AccountType.LIABILITY,
      );
      const equityAccounts = accountsWithBalances.filter(
        (acc) => acc.type === AccountType.EQUITY,
      );
      const revenueAccounts = accountsWithBalances.filter(
        (acc) => acc.type === AccountType.REVENUE,
      );
      const expenseAccounts = accountsWithBalances.filter(
        (acc) => acc.type === AccountType.EXPENSE,
      );

      const totalAssets = assetAccounts.reduce(
        (sum, acc) => sum + acc.balance,
        0,
      );
      const totalLiabilities = liabilityAccounts.reduce(
        (sum, acc) => sum + Math.abs(acc.balance),
        0,
      );
      const totalEquity = equityAccounts.reduce(
        (sum, acc) => sum + Math.abs(acc.balance),
        0,
      );
      const totalRevenue = revenueAccounts.reduce(
        (sum, acc) => sum + Math.abs(acc.balance),
        0,
      );
      const totalExpenses = expenseAccounts.reduce(
        (sum, acc) => sum + acc.balance,
        0,
      );

      // Cash flow summary
      const cashAccounts = accountsWithBalances.filter((acc) => acc.isCash);
      const totalCash = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);

      // Count summaries
      const totalTransactions = await this.tenantPrisma.client.transaction.count({
        where: { isDeleted: false },
      });

      const totalClients = await this.tenantPrisma.client.client.count();

      const totalInvoices = await Promise.all([
        this.tenantPrisma.client.salesInvoice.count(),
        this.tenantPrisma.client.purchaseInvoice.count(),
      ]);

      return {
        summary: {
          totalAssets,
          totalLiabilities,
          totalEquity,
          totalRevenue,
          totalExpenses,
          totalCash,
          netIncome: totalRevenue - totalExpenses,
          mainCurrency: mainCurrency?.code || 'IQD',
        },
        counts: {
          totalAccounts: accounts.length,
          totalTransactions,
          totalClients,
          totalSalesInvoices: totalInvoices[0],
          totalPurchaseInvoices: totalInvoices[1],
        },
        byAccountType: {
          assets: {
            count: assetAccounts.length,
            total: totalAssets,
            accounts: assetAccounts.slice(0, 5).map((acc) => ({
              id: acc.id,
              name: acc.name,
              balance: acc.balance,
              currency: acc.currency?.code || 'IQD',
            })),
          },
          liabilities: {
            count: liabilityAccounts.length,
            total: totalLiabilities,
            accounts: liabilityAccounts.slice(0, 5).map((acc) => ({
              id: acc.id,
              name: acc.name,
              balance: Math.abs(acc.balance),
              currency: acc.currency?.code || 'IQD',
            })),
          },
          equity: {
            count: equityAccounts.length,
            total: totalEquity,
            accounts: equityAccounts.slice(0, 5).map((acc) => ({
              id: acc.id,
              name: acc.name,
              balance: Math.abs(acc.balance),
              currency: acc.currency?.code || 'IQD',
            })),
          },
          revenue: {
            count: revenueAccounts.length,
            total: totalRevenue,
            accounts: revenueAccounts.slice(0, 5).map((acc) => ({
              id: acc.id,
              name: acc.name,
              balance: Math.abs(acc.balance),
              currency: acc.currency?.code || 'IQD',
            })),
          },
          expenses: {
            count: expenseAccounts.length,
            total: totalExpenses,
            accounts: expenseAccounts.slice(0, 5).map((acc) => ({
              id: acc.id,
              name: acc.name,
              balance: acc.balance,
              currency: acc.currency?.code || 'IQD',
            })),
          },
        },
        recentTransactions: recentTransactions.map((transaction) => ({
          id: transaction.id,
          date: transaction.date,
          description: transaction.description,
          totalAmount: transaction.entries.reduce(
            (sum, line) => sum + line.debit,
            0,
          ),
          client: transaction.client
            ? {
                id: transaction.client.id,
                name: transaction.client.name,
              }
            : null,
          linesCount: transaction.entries.length,
        })),
        cashFlow: {
          totalCash,
          cashAccounts: cashAccounts.map((acc) => ({
            id: acc.id,
            name: acc.name,
            balance: acc.balance,
            currency: acc.currency?.code || 'IQD',
          })),
        },
      };
    } catch (error) {
      this.logger.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  async getFinancialSummary(startDate?: Date, endDate?: Date) {
    try {
      const whereClause: any = {
        isDeleted: false,
      };

      if (startDate) {
        whereClause.date = { gte: startDate };
      }

      if (endDate) {
        whereClause.date = {
          ...whereClause.date,
          lte: endDate,
        };
      }

      // Get transaction lines within date range
      const transactionLines = await this.tenantPrisma.client.transactionLine.findMany({
        where: {
          transaction: whereClause,
        },
        include: {
          account: true,
          transaction: true,
        },
      });

      // Group by account type
      const summary = {
        [AccountType.ASSET]: { debit: 0, credit: 0, net: 0 },
        [AccountType.LIABILITY]: { debit: 0, credit: 0, net: 0 },
        [AccountType.EQUITY]: { debit: 0, credit: 0, net: 0 },
        [AccountType.REVENUE]: { debit: 0, credit: 0, net: 0 },
        [AccountType.EXPENSE]: { debit: 0, credit: 0, net: 0 },
      };

      transactionLines.forEach((line) => {
        const accountType = line.account.type;
        summary[accountType].debit += line.debit;
        summary[accountType].credit += line.credit;
        summary[accountType].net += line.debit - line.credit;
      });

      // Calculate key metrics
      const totalRevenue = Math.abs(summary[AccountType.REVENUE].net);
      const totalExpenses = summary[AccountType.EXPENSE].net;
      const netIncome = totalRevenue - totalExpenses;

      return {
        period: {
          startDate,
          endDate,
        },
        summary,
        metrics: {
          totalRevenue,
          totalExpenses,
          netIncome,
          grossMargin:
            totalRevenue > 0
              ? ((totalRevenue - totalExpenses) / totalRevenue) * 100
              : 0,
        },
      };
    } catch (error) {
      this.logger.error('Error getting financial summary:', error);
      throw error;
    }
  }

  async getAccountTypesSummary() {
    try {
      const accountTypes = Object.values(AccountType);
      const summary = [];

      for (const type of accountTypes) {
        const accounts = await this.tenantPrisma.client.account.findMany({
          where: {
            type,
            isDeleted: false,
          },
        });

        let totalBalance = 0;
        let totalDebits = 0;
        let totalCredits = 0;

        for (const account of accounts) {
          const balanceResult = await this.tenantPrisma.client.transactionLine.aggregate({
            where: {
              accountId: account.id,
              transaction: {
                isDeleted: false,
              },
            },
            _sum: {
              debit: true,
              credit: true,
            },
          });

          const debit = balanceResult._sum.debit || 0;
          const credit = balanceResult._sum.credit || 0;
          const balance = debit - credit;

          totalDebits += debit;
          totalCredits += credit;
          totalBalance += balance;
        }

        summary.push({
          type,
          accountsCount: accounts.length,
          totalBalance,
          totalDebits,
          totalCredits,
        });
      }

      return summary;
    } catch (error) {
      this.logger.error('Error getting account types summary:', error);
      throw error;
    }
  }
}
