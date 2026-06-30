import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountsModule } from './accounts/accounts.module';
import { ClientsModule } from './clients/clients.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { DefaultAccountsModule } from './default-accounts/default-accounts.module';
import { InvoiceConfigsModule } from './invoice-configs/invoice-configs.module';
import { InvoiceTemplatesModule } from './invoice-templates/invoice-templates.module';
import { PaymentsModule } from './payments/payments.module';
import { PurchaseInvoicesModule } from './purchase-invoices/purchase-invoices.module';
import { PurchaseReturnInvoicesModule } from './purchase-return-invoices/purchase-return-invoices.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReportsModule } from './reports/reports.module';
import { SalesInvoicesModule } from './sales-invoices/sales-invoices.module';
import { SalesReturnInvoicesModule } from './sales-return-invoices/sales-return-invoices.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    PrismaModule,
    AccountsModule,
    ClientsModule,
    TransactionsModule,
    SalesInvoicesModule,
    PurchaseInvoicesModule,
    PurchaseReturnInvoicesModule,
    SalesReturnInvoicesModule,
    PaymentsModule,
    ReceiptsModule,
    InvoiceConfigsModule,
    InvoiceTemplatesModule,
    CurrenciesModule,
    ReportsModule,
    DefaultAccountsModule,
  ],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService, SalesInvoicesModule],
})
export class AccountingModule {}
