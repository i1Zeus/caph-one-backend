import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTransactionDto,
  FilterTransactionsDto,
  UpdateTransactionDto,
} from './dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId?: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User is not authenticated');
      }
      // Validate that total debits equal total credits
      const totalDebits = createTransactionDto.entries.reduce(
        (sum, entry) => sum + entry.debit,
        0,
      );
      const totalCredits = createTransactionDto.entries.reduce(
        (sum, entry) => sum + entry.credit,
        0,
      );

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new BadRequestException('Total debits must equal total credits');
      }

      // Validate that all accounts exist
      const accountIds = createTransactionDto.entries.map(
        (entry) => entry.accountId,
      );
      const accounts = await this.tenantPrisma.client.account.findMany({
        where: {
          id: { in: accountIds },
          isDeleted: false,
        },
      });

      if (accounts.length !== accountIds.length) {
        throw new BadRequestException('One or more accounts do not exist');
      }

      // Validate client exists if provided
      if (createTransactionDto.clientId) {
        const client = await this.tenantPrisma.client.client.findUnique({
          where: { id: createTransactionDto.clientId },
        });
        if (!client) {
          throw new BadRequestException('Client does not exist');
        }
      }

      const transaction = await this.tenantPrisma.client.transaction.create({
        data: {
          date: createTransactionDto.date
            ? new Date(createTransactionDto.date)
            : new Date(),
          description: createTransactionDto.description,
          clientId: createTransactionDto.clientId,
          entries: {
            create: createTransactionDto.entries.map((entry) => ({
              debit: entry.debit,
              credit: entry.credit,
              accountId: entry.accountId,
            })),
          },
        },
        include: {
          entries: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      this.logger.log(`Transaction created with ID: ${transaction.id}`);
      return transaction;
    } catch (error) {
      this.logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  async findAll(filters: FilterTransactionsDto) {
    try {
      const {
        page = 1,
        limit = 20,
        accountId,
        clientId,
        startDate,
        endDate,
        search,
      } = filters;

      const skip = (page - 1) * limit;
      const where: any = {
        isDeleted: false,
      };

      if (accountId) {
        where.entries = {
          some: {
            accountId: accountId,
          },
        };
      }

      if (clientId) {
        where.clientId = clientId;
      }

      if (startDate) {
        where.date = { gte: new Date(startDate) };
      }

      if (endDate) {
        where.date = {
          ...where.date,
          lte: new Date(endDate),
        };
      }

      if (search) {
        where.description = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const [transactions, total] = await Promise.all([
        this.tenantPrisma.client.transaction.findMany({
          where,
          include: {
            entries: {
              include: {
                account: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            salesInvoice: {
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                status: true,
              },
            },
            purchaseInvoice: {
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                status: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
          skip,
          take: limit,
        }),
        this.tenantPrisma.client.transaction.count({ where }),
      ]);

      return {
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error finding transactions:', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      const transaction = await this.tenantPrisma.client.transaction.findUnique({
        where: {
          id,
          isDeleted: false,
        },
        include: {
          entries: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          salesInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          purchaseInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
            },
          },
        },
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      // Validate transaction balance
      const totalDebits = transaction.entries.reduce(
        (sum, entry) => sum + entry.debit,
        0,
      );
      const totalCredits = transaction.entries.reduce(
        (sum, entry) => sum + entry.credit,
        0,
      );

      return {
        ...transaction,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        totalDebits,
        totalCredits,
      };
    } catch (error) {
      this.logger.error(`Error finding transaction ${id}:`, error);
      throw error;
    }
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto) {
    try {
      // const existingTransaction = await this.findOne(id);

      // If entries are being updated, validate the balance
      if (updateTransactionDto.entries) {
        const totalDebits = updateTransactionDto.entries.reduce(
          (sum, entry) => sum + entry.debit,
          0,
        );
        const totalCredits = updateTransactionDto.entries.reduce(
          (sum, entry) => sum + entry.credit,
          0,
        );

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          throw new BadRequestException(
            'Total debits must equal total credits',
          );
        }

        // Validate that all accounts exist
        const accountIds = updateTransactionDto.entries.map(
          (entry) => entry.accountId,
        );
        const accounts = await this.tenantPrisma.client.account.findMany({
          where: {
            id: { in: accountIds },
            isDeleted: false,
          },
        });

        if (accounts.length !== accountIds.length) {
          throw new BadRequestException('One or more accounts do not exist');
        }
      }

      const transaction = await this.tenantPrisma.client.transaction.update({
        where: { id },
        data: {
          date: updateTransactionDto.date
            ? new Date(updateTransactionDto.date)
            : undefined,
          description: updateTransactionDto.description,
          clientId: updateTransactionDto.clientId,
          entries: updateTransactionDto.entries
            ? {
                deleteMany: {},
                create: updateTransactionDto.entries.map((entry) => ({
                  debit: entry.debit,
                  credit: entry.credit,
                  accountId: entry.accountId,
                })),
              }
            : undefined,
        },
        include: {
          entries: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      this.logger.log(`Transaction ${id} updated successfully`);
      return transaction;
    } catch (error) {
      this.logger.error(`Error updating transaction ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      // const transaction = await this.findOne(id);

      // Soft delete the transaction
      await this.tenantPrisma.client.transaction.update({
        where: { id },
        data: { isDeleted: true },
      });

      this.logger.log(`Transaction ${id} deleted successfully`);
      return { message: 'Transaction deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting transaction ${id}:`, error);
      throw error;
    }
  }

  async getSummary(filters?: any) {
    try {
      const where: any = {
        isDeleted: false,
      };

      if (filters?.startDate) {
        where.date = { gte: new Date(filters.startDate) };
      }

      if (filters?.endDate) {
        where.date = {
          ...where.date,
          lte: new Date(filters.endDate),
        };
      }

      const [totalTransactions, totalDebits, totalCredits] = await Promise.all([
        this.tenantPrisma.client.transaction.count({ where }),
        this.tenantPrisma.client.transactionLine.aggregate({
          where: {
            transaction: where,
          },
          _sum: {
            debit: true,
          },
        }),
        this.tenantPrisma.client.transactionLine.aggregate({
          where: {
            transaction: where,
          },
          _sum: {
            credit: true,
          },
        }),
      ]);

      return {
        totalTransactions,
        totalDebits: totalDebits._sum.debit || 0,
        totalCredits: totalCredits._sum.credit || 0,
        isBalanced:
          Math.abs(
            (totalDebits._sum.debit || 0) - (totalCredits._sum.credit || 0),
          ) < 0.01,
      };
    } catch (error) {
      this.logger.error('Error getting transactions summary:', error);
      throw error;
    }
  }

  async getAccountBalance(accountId: number, asOfDate?: Date) {
    try {
      const where: any = {
        accountId,
        isDeleted: false, // Filter out soft-deleted transaction lines
        transaction: {
          isDeleted: false,
        },
      };

      if (asOfDate) {
        where.transaction.date = { lte: asOfDate };
      }

      const result = await this.tenantPrisma.client.transactionLine.aggregate({
        where,
        _sum: {
          debit: true,
          credit: true,
        },
      });

      const totalDebits = result._sum.debit || 0;
      const totalCredits = result._sum.credit || 0;
      const balance = totalDebits - totalCredits;

      return {
        accountId,
        totalDebits,
        totalCredits,
        balance,
        asOfDate: asOfDate || new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error getting account balance for account ${accountId}:`,
        error,
      );
      throw error;
    }
  }

  async getAccountTransactions(accountId: number, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        this.tenantPrisma.client.transaction.findMany({
          where: {
            isDeleted: false,
            entries: {
              some: {
                accountId: accountId,
                isDeleted: false, // Filter out soft-deleted entries
              },
            },
          },
          include: {
            entries: {
              where: {
                accountId: accountId,
                isDeleted: false, // Filter out soft-deleted entries
              },
              include: {
                account: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
          skip,
          take: limit,
        }),
        this.tenantPrisma.client.transaction.count({
          where: {
            isDeleted: false,
            entries: {
              some: {
                accountId: accountId,
                isDeleted: false, // Filter out soft-deleted entries
              },
            },
          },
        }),
      ]);

      // Calculate running balance
      let runningBalance = 0;
      const transactionsWithBalance = transactions.map((transaction) => {
        const debit = transaction.entries.reduce(
          (sum, line) => sum + line.debit,
          0,
        );
        const credit = transaction.entries.reduce(
          (sum, line) => sum + line.credit,
          0,
        );
        runningBalance += debit - credit;

        return {
          ...transaction,
          accountDebit: debit,
          accountCredit: credit,
          runningBalance,
        };
      });

      return {
        data: transactionsWithBalance,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting transactions for account ${accountId}:`,
        error,
      );
      throw error;
    }
  }

  async getAccountsWithBalances() {
    try {
      const accounts = await this.tenantPrisma.client.account.findMany({
        where: { isDeleted: false },
        include: {
          entries: {
            where: {
              transaction: {
                isDeleted: false,
              },
            },
          },
        },
      });

      const accountsWithBalances = accounts.map((account) => {
        const totalDebits = account.entries.reduce(
          (sum, line) => sum + line.debit,
          0,
        );
        const totalCredits = account.entries.reduce(
          (sum, line) => sum + line.credit,
          0,
        );
        const balance = totalDebits - totalCredits;

        return {
          id: account.id,
          name: account.name,
          type: account.type,
          isCash: account.isCash,
          totalDebits,
          totalCredits,
          balance,
          transactionCount: account.entries.length,
        };
      });

      return accountsWithBalances;
    } catch (error) {
      this.logger.error('Error getting accounts with balances:', error);
      throw error;
    }
  }

  async getTransactionsSummary(filters?: any) {
    return this.getSummary(filters);
  }
}
