import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateDefaultAccountsDto } from './dto';

@Injectable()
export class DefaultAccountsService {
  private readonly logger = new Logger(DefaultAccountsService.name);

  constructor(private readonly prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async getDefaultAccounts() {
    this.logger.log('Getting default accounts');

    // Get or create the single settings row
    let settings = await this.tenantPrisma.client.accountingSettings.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        defaultCustomerAccountId: true,
        defaultSupplierAccountId: true,
        defaultCustomerAccount: {
          select: {
            id: true,
            name: true,
            type: true,
            code: true,
            currency: {
              select: {
                code: true,
                symbol: true,
              },
            },
          },
        },
        defaultSupplierAccount: {
          select: {
            id: true,
            name: true,
            type: true,
            code: true,
            currency: {
              select: {
                code: true,
                symbol: true,
              },
            },
          },
        },
      },
    });

    // If no settings exist, create the default row
    if (!settings) {
      settings = await this.tenantPrisma.client.accountingSettings.create({
        data: { id: 1 },
        select: {
          id: true,
          defaultCustomerAccountId: true,
          defaultSupplierAccountId: true,
          defaultCustomerAccount: {
            select: {
              id: true,
              name: true,
              type: true,
              code: true,
              currency: {
                select: {
                  code: true,
                  symbol: true,
                },
              },
            },
          },
          defaultSupplierAccount: {
            select: {
              id: true,
              name: true,
              type: true,
              code: true,
              currency: {
                select: {
                  code: true,
                  symbol: true,
                },
              },
            },
          },
        },
      });
    }

    return {
      defaultCustomerAccountId: settings.defaultCustomerAccountId,
      defaultSupplierAccountId: settings.defaultSupplierAccountId,
      defaultCustomerAccount: settings.defaultCustomerAccount,
      defaultSupplierAccount: settings.defaultSupplierAccount,
    };
  }

  async updateDefaultAccounts(dto: UpdateDefaultAccountsDto) {
    this.logger.log('Updating default accounts');

    // Validate accounts if provided
    if (dto.defaultCustomerAccountId) {
      const customerAccount = await this.tenantPrisma.client.account.findUnique({
        where: { id: dto.defaultCustomerAccountId },
      });
      if (!customerAccount) {
        throw new Error(
          `Customer account with ID ${dto.defaultCustomerAccountId} not found`,
        );
      }
    }

    if (dto.defaultSupplierAccountId) {
      const supplierAccount = await this.tenantPrisma.client.account.findUnique({
        where: { id: dto.defaultSupplierAccountId },
      });
      if (!supplierAccount) {
        throw new Error(
          `Supplier account with ID ${dto.defaultSupplierAccountId} not found`,
        );
      }
    }

    // Upsert the settings (create if not exists, update if exists)
    const updatedSettings = await this.tenantPrisma.client.accountingSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        defaultCustomerAccountId: dto.defaultCustomerAccountId,
        defaultSupplierAccountId: dto.defaultSupplierAccountId,
      },
      update: {
        defaultCustomerAccountId: dto.defaultCustomerAccountId,
        defaultSupplierAccountId: dto.defaultSupplierAccountId,
      },
      select: {
        id: true,
        defaultCustomerAccountId: true,
        defaultSupplierAccountId: true,
        defaultCustomerAccount: {
          select: {
            id: true,
            name: true,
            type: true,
            code: true,
            currency: {
              select: {
                code: true,
                symbol: true,
              },
            },
          },
        },
        defaultSupplierAccount: {
          select: {
            id: true,
            name: true,
            type: true,
            code: true,
            currency: {
              select: {
                code: true,
                symbol: true,
              },
            },
          },
        },
      },
    });

    return {
      defaultCustomerAccountId: updatedSettings.defaultCustomerAccountId,
      defaultSupplierAccountId: updatedSettings.defaultSupplierAccountId,
      defaultCustomerAccount: updatedSettings.defaultCustomerAccount,
      defaultSupplierAccount: updatedSettings.defaultSupplierAccount,
    };
  }
}
