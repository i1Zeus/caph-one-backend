import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientQueryDto, CreateClientDto, UpdateClientDto } from './dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    try {
      const client = await this.prisma.client.create({
        data: createClientDto,
      });
      this.logger.log(`Created client: ${client.name}`);
      return client;
    } catch (error) {
      this.logger.error('Error creating client:', error.message);
      throw new BadRequestException('Failed to create client');
    }
  }

  async findAll(queryDto: ClientQueryDto) {
    try {
      const {
        search,
        type,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc',
      } = queryDto;

      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (type) {
        whereClause.type = type;
      }

      const skip = (page - 1) * limit;

      // Get valid sort field
      const validSortFields = ['name', 'type', 'createdAt', 'updatedAt'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';

      const [clients, total] = await Promise.all([
        this.prisma.client.findMany({
          where: whereClause,
          include: {
            account: {
              select: {
                id: true,
                name: true,
                type: true,
                currency: true,
              },
            },
            _count: {
              select: {
                transactions: true,
                transactionLines: true,
              },
            },
          },
          orderBy: { [sortField]: sortOrder },
          skip,
          take: limit,
        }),
        this.prisma.client.count({ where: whereClause }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data: clients,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching clients:', error.message);
      throw new BadRequestException('Failed to fetch clients');
    }
  }

  // Quick search for clients (for dropdowns/autocomplete)
  async searchClients(
    search: string = '',
    type?: 'CUSTOMER' | 'SUPPLIER',
    limit: number = 15,
  ) {
    try {
      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (type) {
        whereClause.type = type;
      }

      const clients = await this.prisma.client.findMany({
        where: whereClause,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              code: true,
              entries: {
                select: {
                  debit: true,
                  credit: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
      });

      // Calculate balance for each client
      return clients.map((client) => {
        let balance = 0;
        if (client.account?.entries) {
          balance = client.account.entries.reduce(
            (sum, entry) => sum + entry.debit - entry.credit,
            0,
          );
        }

        return {
          id: client.id,
          name: client.name,
          phone: client.phone,
          type: client.type,
          balance,
          linkedAccount: client.account
            ? {
                id: client.account.id,
                name: client.account.name,
                code: client.account.code,
              }
            : undefined,
        };
      });
    } catch (error) {
      this.logger.error('Error searching clients:', error.message);
      throw new BadRequestException('Failed to search clients');
    }
  }

  async findOne(id: number) {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              type: true,
              currency: true,
              entries: {
                select: {
                  debit: true,
                  credit: true,
                },
              },
            },
          },
          transactions: {
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
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10, // آخر 10 معاملات
          },
          _count: {
            select: {
              transactions: true,
              transactionLines: true,
            },
          },
        },
      });

      if (!client) {
        throw new NotFoundException(`Client with ID ${id} not found`);
      }

      // حساب الرصيد من entries الحساب المرتبط
      let accountBalance = 0;
      if (client.account?.entries) {
        accountBalance = client.account.entries.reduce(
          (sum, entry) => sum + entry.debit - entry.credit,
          0,
        );
      }

      return {
        ...client,
        accountBalance,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching client:', error.message);
      throw new BadRequestException('Failed to fetch client');
    }
  }

  async getClientTransactions(id: number) {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id },
      });

      if (!client) {
        throw new NotFoundException(`Client with ID ${id} not found`);
      }

      // جلب المعاملات المرتبطة بالعميل
      const transactions = await this.prisma.transaction.findMany({
        where: {
          OR: [{ clientId: id }, { entries: { some: { clientId: id } } }],
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
      this.logger.error('Error fetching client transactions:', error.message);
      throw new BadRequestException('Failed to fetch client transactions');
    }
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    try {
      const client = await this.prisma.client.update({
        where: { id },
        data: updateClientDto,
      });
      this.logger.log(`Updated client: ${client.name}`);
      return client;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Client with ID ${id} not found`);
      }
      this.logger.error('Error updating client:', error.message);
      throw new BadRequestException('Failed to update client');
    }
  }

  async remove(id: number) {
    try {
      // Check if client has transactions or transaction lines
      const client = await this.prisma.client.findUnique({
        where: { id },
        include: {
          transactions: true,
          transactionLines: true,
        },
      });

      if (!client) {
        throw new NotFoundException(`Client with ID ${id} not found`);
      }

      if (
        client.transactions.length > 0 ||
        client.transactionLines.length > 0
      ) {
        throw new BadRequestException(
          'Cannot delete client that has associated transactions',
        );
      }

      await this.prisma.client.delete({
        where: { id },
      });

      this.logger.log(`Deleted client: ${client.name}`);
      return { message: 'Client deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Error deleting client:', error.message);
      throw new BadRequestException('Failed to delete client');
    }
  }
}
