import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto';

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(createCurrencyDto: CreateCurrencyDto) {
    const {
      name,
      code,
      symbol,
      rate,
      isMain,
      decimalPlaces = 2,
      isActive = true,
    } = createCurrencyDto;

    // Check if currency code already exists
    const existingCurrency = await this.tenantPrisma.client.currency.findUnique({
      where: { code },
    });

    if (existingCurrency) {
      throw new ConflictException(`Currency with code ${code} already exists`);
    }

    // If this is set as main currency, unset other main currencies
    if (isMain) {
      await this.tenantPrisma.client.currency.updateMany({
        where: { isMain: true },
        data: { isMain: false },
      });
    }

    return this.tenantPrisma.client.currency.create({
      data: {
        name,
        code,
        symbol,
        rate,
        isMain: isMain || false,
        decimalPlaces,
        isActive,
      },
    });
  }

  async findAll() {
    return this.tenantPrisma.client.currency.findMany({
      where: { isDeleted: false },
      orderBy: [
        { isMain: 'desc' }, // Main currency first
        { isActive: 'desc' }, // Active currencies first
        { name: 'asc' },
      ],
    });
  }

  async findActive() {
    return this.tenantPrisma.client.currency.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });
  }

  async findMain() {
    const mainCurrency = await this.tenantPrisma.client.currency.findFirst({
      where: {
        isMain: true,
        isDeleted: false,
      },
    });

    if (!mainCurrency) {
      // If no main currency exists, create IQD as default main currency
      return this.create({
        name: 'Iraqi Dinar',
        code: 'IQD',
        symbol: 'د.ع',
        rate: 1.0,
        isMain: true,
        decimalPlaces: 0,
        isActive: true,
      });
    }

    return mainCurrency;
  }

  async findOne(id: number) {
    const currency = await this.tenantPrisma.client.currency.findUnique({
      where: { id, isDeleted: false },
    });

    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }

    return currency;
  }

  async findByCode(code: string) {
    const currency = await this.tenantPrisma.client.currency.findUnique({
      where: { code, isDeleted: false },
    });

    if (!currency) {
      throw new NotFoundException(`Currency with code ${code} not found`);
    }

    return currency;
  }

  async update(id: number, updateCurrencyDto: UpdateCurrencyDto) {
    const currency = await this.findOne(id);

    const { code, isMain, ...updateData } = updateCurrencyDto;

    // Check if changing code conflicts with existing currency
    if (code && code !== currency.code) {
      const existingCurrency = await this.tenantPrisma.client.currency.findUnique({
        where: { code },
      });

      if (existingCurrency) {
        throw new ConflictException(
          `Currency with code ${code} already exists`,
        );
      }
    }

    // If setting as main currency, unset other main currencies
    if (isMain === true) {
      await this.tenantPrisma.client.currency.updateMany({
        where: {
          isMain: true,
          id: { not: id },
        },
        data: { isMain: false },
      });
    }

    return this.tenantPrisma.client.currency.update({
      where: { id },
      data: {
        ...updateData,
        ...(code && { code }),
        ...(isMain !== undefined && { isMain }),
      },
    });
  }

  async remove(id: number) {
    const currency = await this.findOne(id);

    // Check if this is the main currency
    if (currency.isMain) {
      throw new BadRequestException('Cannot delete the main currency');
    }

    // Check if currency is being used by any accounts
    const accountsUsingCurrency = await this.tenantPrisma.client.account.count({
      where: {
        currencyId: id,
        isDeleted: false,
      },
    });

    if (accountsUsingCurrency > 0) {
      throw new BadRequestException(
        `Cannot delete currency. It is being used by ${accountsUsingCurrency} account(s)`,
      );
    }

    return this.tenantPrisma.client.currency.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async convertAmount(
    amount: number,
    fromCurrencyId: number,
    toCurrencyId: number,
  ) {
    if (fromCurrencyId === toCurrencyId) {
      return amount;
    }

    const [fromCurrency, toCurrency] = await Promise.all([
      this.findOne(fromCurrencyId),
      this.findOne(toCurrencyId),
    ]);

    // Convert to main currency first, then to target currency
    const amountInMainCurrency = amount / Number(fromCurrency.rate);
    const convertedAmount = amountInMainCurrency * Number(toCurrency.rate);

    return Number(convertedAmount.toFixed(toCurrency.decimalPlaces));
  }

  async updateExchangeRates(rates: { currencyId: number; rate: number }[]) {
    const updates = rates.map(({ currencyId, rate }) =>
      this.tenantPrisma.client.currency.update({
        where: { id: currencyId },
        data: { rate },
      }),
    );

    return this.tenantPrisma.client.$transaction(updates);
  }

  async getCurrencyStats(currencyId: number) {
    // Get accounts using this currency
    const accountsCount = await this.tenantPrisma.client.account.count({
      where: {
        currencyId: currencyId,
        isDeleted: false,
      },
    });

    // Get transaction lines involving accounts with this currency
    const transactionLinesCount = await this.tenantPrisma.client.transactionLine.count({
      where: {
        account: {
          currencyId: currencyId,
          isDeleted: false,
        },
        isDeleted: false,
      },
    });

    // Get clients using this currency through their linked accounts
    // const currency = await this.findOne(currencyId);
    const clientsCount = await this.tenantPrisma.client.client.count({
      where: {
        account: {
          currencyId: currencyId,
        },
      },
    });

    // Get invoices using this currency
    const salesInvoicesCount = await this.tenantPrisma.client.salesInvoice.count({
      where: {
        currencyId: currencyId,
        isDeleted: false,
      },
    });

    const purchaseInvoicesCount = await this.tenantPrisma.client.purchaseInvoice.count({
      where: {
        currencyId: currencyId,
        isDeleted: false,
      },
    });

    return {
      accountsCount,
      transactionLinesCount,
      clientsCount,
      salesInvoicesCount,
      purchaseInvoicesCount,
      totalUsage:
        accountsCount +
        transactionLinesCount +
        clientsCount +
        salesInvoicesCount +
        purchaseInvoicesCount,
    };
  }

  async getAllCurrencyStats() {
    const currencies = await this.findAll();
    const stats = await Promise.all(
      currencies.map(async (currency) => ({
        currencyId: currency.id,
        currencyCode: currency.code,
        currencyName: currency.name,
        ...(await this.getCurrencyStats(currency.id)),
      })),
    );

    return stats;
  }
}
