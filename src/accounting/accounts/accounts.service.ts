import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateTransactionDto,
} from './dto';
import { AccountType } from '@prisma/client';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(private readonly prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  /**
   * Calculate account balance based on double-entry accounting principles
   *
   * في الأنظمة المحاسبية وفق نظام القيد المزدوج:
   * 1. حسابات الأصول والمصروفات: طبيعتها مدينة (تزداد بالمدين وتقل بالدائن)
   * 2. حسابات الخصوم وحقوق الملكية والإيرادات: طبيعتها دائنة (تزداد بالدائن وتقل بالمدين)
   *
   * @param entries - Array of transaction entries for the account
   * @param accountType - Type of the account (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
   * @returns Calculated balance (positive = normal balance, negative = abnormal balance)
   */
  private calculateAccountBalance(entries: any[], accountType: string): number {
    const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);

    // حسابات الأصول والمصروفات: طبيعة مدينة
    // Assets and Expenses: Debit nature (increase with debit, decrease with credit)
    if (accountType === 'ASSET' || accountType === 'EXPENSE') {
      return totalDebit - totalCredit;
    }
    // حسابات الخصوم وحقوق الملكية والإيرادات: طبيعة دائنة
    // Liabilities, Equity, and Revenue: Credit nature (increase with credit, decrease with debit)
    else if (
      accountType === 'LIABILITY' ||
      accountType === 'EQUITY' ||
      accountType === 'REVENUE'
    ) {
      return totalCredit - totalDebit;
    }

    return 0; // Default case
  }

  /**
   * Calculate comprehensive account balance including children balances
   * حساب الرصيد الشامل للحساب بما يشمل أرصدة الحسابات الفرعية
   *
   * @param accountId - ID of the account
   * @param accountType - Type of the account
   * @param includeChildren - Whether to include children balances (default: true)
   * @returns Promise<number> - Total balance including children
   */
  private async calculateAccountBalanceWithChildren(
    accountId: number,
    accountType: string,
    includeChildren: boolean = true,
  ): Promise<number> {
    // Calculate own balance from transaction entries
    const ownEntries = await this.tenantPrisma.client.transactionLine.findMany({
      where: {
        accountId: accountId,
        isDeleted: false, // Filter out soft-deleted transaction lines
        transaction: {
          isDeleted: false,
        },
      },
      select: {
        debit: true,
        credit: true,
      },
    });

    const ownBalance = this.calculateAccountBalance(ownEntries, accountType);

    // If includeChildren is false, return only own balance
    if (!includeChildren) {
      return ownBalance;
    }

    // Get all children accounts
    const children = await this.tenantPrisma.client.account.findMany({
      where: {
        parentId: accountId,
        isDeleted: false,
      },
      select: {
        id: true,
        type: true,
      },
    });

    // Calculate children balances recursively
    let childrenBalance = 0;
    for (const child of children) {
      const childBalance = await this.calculateAccountBalanceWithChildren(
        child.id,
        child.type,
        true,
      );
      childrenBalance += childBalance;
    }

    return ownBalance + childrenBalance;
  }

  async create(createAccountDto: CreateAccountDto) {
    try {
      // Validate parent account if provided
      if (createAccountDto.parentId) {
        const parentAccount = await this.tenantPrisma.client.account.findUnique({
          where: { id: createAccountDto.parentId, isDeleted: false },
        });

        if (!parentAccount) {
          throw new BadRequestException('Parent account not found');
        }

        // Ensure child account has same type as parent (business rule)
        if (parentAccount.type !== createAccountDto.type) {
          throw new BadRequestException(
            'Child account must have the same type as parent account',
          );
        }
      }

      const account = await this.tenantPrisma.client.account.create({
        data: {
          name: createAccountDto.name,
          code: createAccountDto.code,
          type: createAccountDto.type,
          isCash: createAccountDto.isCash || false,
          currencyId: createAccountDto.currencyId,
          parentId: createAccountDto.parentId,
        },
        include: {
          currency: true,
          parent: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      this.logger.log(
        `Created account: ${account.name}${account.parentId ? ` under parent: ${account.parent?.name}` : ''}`,
      );
      return account;
    } catch (error) {
      this.logger.error('Error creating account:', error.message);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to create account');
    }
  }

  async findAll(
    filters: {
      type?: AccountType;
      isCash?: boolean;
      parentId?: number | null;
    } = {},
  ) {
    try {
      const whereClause: any = {
        isDeleted: false,
      };

      if (filters.type) {
        whereClause.type = filters.type;
      }

      if (filters.isCash !== undefined) {
        whereClause.isCash = filters.isCash;
      }

      // Filter by parent - if parentId is null, get root accounts only
      if ('parentId' in filters) {
        whereClause.parentId = filters.parentId;
      }

      const accounts = await this.tenantPrisma.client.account.findMany({
        where: whereClause,
        include: {
          currency: true,
          parent: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
            },
          },
          entries: {
            select: {
              debit: true,
              credit: true,
            },
          },
          _count: {
            select: {
              entries: true,
              linkedClients: true,
              children: {
                where: {
                  isDeleted: false,
                },
              },
            },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });

      // Add calculated balance to each account using double-entry accounting principles (including children)
      const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => ({
          ...account,
          balance: await this.calculateAccountBalanceWithChildren(
            account.id,
            account.type,
            true,
          ),
          entries: undefined, // Remove entries from response to keep it clean
        })),
      );

      return accountsWithBalances;
    } catch (error) {
      this.logger.error('Error fetching accounts:', error.message);
      throw new BadRequestException('Failed to fetch accounts');
    }
  }

  async getAccountsSummary() {
    try {
      const accounts = await this.tenantPrisma.client.account.findMany({
        where: { isDeleted: false },
        include: {
          entries: {
            where: { isDeleted: false }, // Filter out soft-deleted transaction lines
            select: {
              debit: true,
              credit: true,
            },
          },
        },
      });

      // Group by account type
      const summary = accounts.reduce(
        (acc, account) => {
          if (!acc[account.type]) {
            acc[account.type] = {
              type: account.type,
              accounts: [],
              totalBalance: 0,
              accountCount: 0,
            };
          }

          // Calculate account balance using double-entry accounting principles
          const balance = this.calculateAccountBalance(
            account.entries,
            account.type,
          );

          acc[account.type].accounts.push({
            id: account.id,
            name: account.name,
            balance,
          });
          acc[account.type].totalBalance += balance;
          acc[account.type].accountCount += 1;

          return acc;
        },
        {} as Record<string, any>,
      );

      return Object.values(summary);
    } catch (error) {
      this.logger.error('Error fetching accounts summary:', error.message);
      throw new BadRequestException('Failed to fetch accounts summary');
    }
  }

  async findNonClientLinkedAccounts(filters: { type?: AccountType } = {}) {
    try {
      const whereClause: any = {
        isDeleted: false,
        linkedClients: {
          none: {}, // No linked clients
        },
      };

      if (filters.type) {
        whereClause.type = filters.type;
      }

      return await this.tenantPrisma.client.account.findMany({
        where: whereClause,
        include: {
          currency: true,
          _count: {
            select: {
              entries: true,
              linkedClients: true,
            },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
    } catch (error) {
      this.logger.error(
        'Error fetching non-client-linked accounts:',
        error.message,
      );
      throw new BadRequestException(
        'Failed to fetch non-client-linked accounts',
      );
    }
  }

  async findOne(id: number) {
    try {
      const account = await this.tenantPrisma.client.account.findUnique({
        where: { id, isDeleted: false },
        include: {
          currency: true,
          entries: {
            where: { isDeleted: false }, // Filter out soft-deleted transaction lines
            include: {
              transaction: {
                select: {
                  id: true,
                  description: true,
                  date: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              entries: {
                where: { isDeleted: false }, // Filter out soft-deleted entries in count
              },
              linkedClients: true,
              children: {
                where: {
                  isDeleted: false,
                },
              },
            },
          },
        },
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${id} not found`);
      }

      // Calculate balance using double-entry accounting principles
      const balance = this.calculateAccountBalance(
        account.entries,
        account.type,
      );

      return {
        ...account,
        balance,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching account:', error.message);
      throw new BadRequestException('Failed to fetch account');
    }
  }

  async getAccountTransactions(id: number) {
    try {
      const account = await this.tenantPrisma.client.account.findUnique({
        where: { id, isDeleted: false },
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${id} not found`);
      }

      const transactions = await this.tenantPrisma.client.transactionLine.findMany({
        where: {
          accountId: id,
          isDeleted: false,
        },
        include: {
          transaction: {
            select: {
              id: true,
              description: true,
              date: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return transactions;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching account transactions:', error.message);
      throw new BadRequestException('Failed to fetch account transactions');
    }
  }

  /**
   * Get accounts in tree structure (hierarchical)
   */
  async findAllAsTree(filters: { type?: AccountType; isCash?: boolean } = {}) {
    try {
      const whereClause: any = {
        isDeleted: false,
        parentId: null, // Root accounts only
      };

      if (filters.type) {
        whereClause.type = filters.type;
      }

      if (filters.isCash !== undefined) {
        whereClause.isCash = filters.isCash;
      }

      const rootAccounts = await this.tenantPrisma.client.account.findMany({
        where: whereClause,
        include: {
          currency: true,
          entries: {
            select: {
              debit: true,
              credit: true,
            },
          },
          _count: {
            select: {
              entries: true,
              linkedClients: true,
              children: { where: { isDeleted: false } },
            },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });

      // Add calculated balance to each account (including children)
      const accountsWithBalances = await Promise.all(
        rootAccounts.map(async (account) => ({
          ...account,
          balance: await this.calculateAccountBalanceWithChildren(
            account.id,
            account.type,
            true,
          ),
          entries: undefined, // Remove entries from response to keep it clean
        })),
      );

      return accountsWithBalances;
    } catch (error) {
      this.logger.error('Error fetching accounts tree:', error.message);
      throw new BadRequestException('Failed to fetch accounts tree');
    }
  }

  /**
   * Get children accounts for a specific parent account
   */
  async getAccountChildren(parentId: number) {
    try {
      const children = await this.tenantPrisma.client.account.findMany({
        where: {
          parentId: parentId,
          isDeleted: false,
        },
        include: {
          currency: true,
          entries: {
            select: {
              debit: true,
              credit: true,
            },
          },
          _count: {
            select: {
              entries: true,
              linkedClients: true,
              children: { where: { isDeleted: false } },
            },
          },
        },
        orderBy: [{ name: 'asc' }],
      });

      // Add calculated balance to each child account (including their children)
      const childrenWithBalances = await Promise.all(
        children.map(async (account) => ({
          ...account,
          balance: await this.calculateAccountBalanceWithChildren(
            account.id,
            account.type,
            true,
          ),
          entries: undefined, // Remove entries from response to keep it clean
        })),
      );

      return childrenWithBalances;
    } catch (error) {
      this.logger.error(
        `Error fetching children for account ${parentId}:`,
        error.message,
      );
      throw new BadRequestException('Failed to fetch account children');
    }
  }

  /**
   * Get account balance with option to include or exclude children
   */
  async getAccountBalance(accountId: number, includeChildren: boolean = true) {
    try {
      const account = await this.tenantPrisma.client.account.findUnique({
        where: { id: accountId, isDeleted: false },
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          _count: {
            select: {
              children: { where: { isDeleted: false } },
            },
          },
        },
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${accountId} not found`);
      }

      const ownBalance = await this.calculateAccountBalanceWithChildren(
        account.id,
        account.type,
        false,
      );
      const totalBalance = await this.calculateAccountBalanceWithChildren(
        account.id,
        account.type,
        includeChildren,
      );

      return {
        accountId: account.id,
        accountName: account.name,
        accountCode: account.code,
        accountType: account.type,
        ownBalance, // رصيد الحساب نفسه فقط
        totalBalance, // الرصيد الإجمالي شامل الأطفال
        childrenBalance: totalBalance - ownBalance, // رصيد الأطفال فقط
        hasChildren: account._count.children > 0,
        childrenCount: account._count.children,
      };
    } catch (error) {
      this.logger.error(
        `Error getting account balance for account ${accountId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Search accounts by name with pagination
   */
  async searchAccounts(
    query: string,
    limit: number = 10,
    isCash?: boolean,
    type?: AccountType,
  ) {
    try {
      const whereClause: any = {
        isDeleted: false,
      };

      if (query) {
        whereClause.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (isCash !== undefined) {
        whereClause.isCash = isCash;
      }

      if (type) {
        whereClause.type = type;
      }

      const accounts = await this.tenantPrisma.client.account.findMany({
        where: whereClause,
        include: {
          currency: true,
          parent: {
            select: {
              name: true,
            },
          },
          entries: {
            select: {
              debit: true,
              credit: true,
            },
          },
          _count: {
            select: {
              entries: true,
              linkedClients: true,
              children: { where: { isDeleted: false } },
            },
          },
        },
        orderBy: [{ name: 'asc' }],
        take: limit,
      });

      // Add calculated balance to each account (including children)
      const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => ({
          ...account,
          balance: await this.calculateAccountBalanceWithChildren(
            account.id,
            account.type,
            true,
          ),
          entries: undefined, // Remove entries from response to keep it clean
        })),
      );

      return accountsWithBalances;
    } catch (error) {
      this.logger.error('Error searching accounts:', error.message);
      throw new BadRequestException('Failed to search accounts');
    }
  }

  /**
   * Get potential parent accounts for a given account type
   */
  async findPotentialParents(accountType: AccountType, excludeId?: number) {
    try {
      const whereClause: any = {
        isDeleted: false,
        type: accountType, // Parent must be of same type
      };

      // Exclude the current account if updating
      if (excludeId) {
        whereClause.id = { not: excludeId };
      }

      const accounts = await this.tenantPrisma.client.account.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          parentId: true,
          parent: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }],
      });

      // Build hierarchical display names
      return accounts.map((account) => ({
        ...account,
        displayName: account.parent
          ? `${account.parent.name} / ${account.name}`
          : account.name,
      }));
    } catch (error) {
      this.logger.error('Error fetching potential parents:', error.message);
      throw new BadRequestException('Failed to fetch potential parents');
    }
  }

  async update(id: number, updateAccountDto: UpdateAccountDto) {
    try {
      // Validate parent account if provided
      if (updateAccountDto.parentId) {
        const parentAccount = await this.tenantPrisma.client.account.findUnique({
          where: { id: updateAccountDto.parentId, isDeleted: false },
        });

        if (!parentAccount) {
          throw new BadRequestException('Parent account not found');
        }

        // Ensure child account has same type as parent (business rule)
        if (
          updateAccountDto.type &&
          parentAccount.type !== updateAccountDto.type
        ) {
          throw new BadRequestException(
            'Child account must have the same type as parent account',
          );
        }

        // Prevent circular reference
        if (updateAccountDto.parentId === id) {
          throw new BadRequestException('Account cannot be its own parent');
        }

        // Check if the parent is not a descendant of this account
        let currentParent = parentAccount;
        while (currentParent.parentId) {
          if (currentParent.parentId === id) {
            throw new BadRequestException(
              'Cannot set parent as it would create a circular reference',
            );
          }
          const nextParent = await this.tenantPrisma.client.account.findUnique({
            where: { id: currentParent.parentId },
          });
          if (!nextParent) break;
          currentParent = nextParent;
        }
      }

      const account = await this.tenantPrisma.client.account.update({
        where: { id, isDeleted: false },
        data: updateAccountDto,
        include: {
          currency: true,
          parent: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      this.logger.log(
        `Updated account: ${account.name}${account.parentId ? ` under parent: ${account.parent?.name}` : ''}`,
      );
      return account;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Account with ID ${id} not found`);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error updating account:', error.message);
      throw new BadRequestException('Failed to update account');
    }
  }

  async remove(id: number) {
    try {
      // Check if account has transaction entries or child accounts
      const account = await this.tenantPrisma.client.account.findUnique({
        where: { id, isDeleted: false },
        include: {
          entries: true,
          children: {
            where: { isDeleted: false },
          },
        },
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${id} not found`);
      }

      if (account.entries.length > 0) {
        throw new BadRequestException(
          'Cannot delete account that has associated transaction entries',
        );
      }

      if (account.children.length > 0) {
        throw new BadRequestException(
          'Cannot delete account that has child accounts. Delete or move child accounts first.',
        );
      }

      // Soft delete
      await this.tenantPrisma.client.account.update({
        where: { id },
        data: { isDeleted: true },
      });

      this.logger.log(`Deleted account: ${account.name}`);
      return { message: 'Account deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Error deleting account:', error.message);
      throw new BadRequestException('Failed to delete account');
    }
  }

  async createTransaction(createTransactionDto: CreateTransactionDto) {
    try {
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
        throw new BadRequestException('One or more accounts not found');
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
              date: createTransactionDto.date
                ? new Date(createTransactionDto.date)
                : new Date(),
              description: entry.description,
              debit: entry.debit,
              credit: entry.credit,
              accountId: entry.accountId,
              clientId: entry.clientId,
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
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`Created accounting transaction: ${transaction.id}`);
      return transaction;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating transaction:', error.message);
      throw new BadRequestException('Failed to create transaction');
    }
  }

  async getCashAccounts() {
    try {
      return await this.tenantPrisma.client.account.findMany({
        where: {
          isCash: true,
          isDeleted: false,
        },
        include: {
          currency: true,
          _count: {
            select: {
              entries: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logger.error('Error fetching cash accounts:', error.message);
      throw new BadRequestException('Failed to fetch cash accounts');
    }
  }
}
