import { Module } from '@nestjs/common';
import { UnitsModule } from '../../inventory/units/units.module';
import { WarehouseTransactionsModule } from '../../inventory/warehouse-transactions/warehouse-transactions.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoiceConfigsModule } from '../invoice-configs/invoice-configs.module';
import { SalesReturnInvoicesController } from './sales-return-invoices.controller';
import { SalesReturnInvoicesService } from './sales-return-invoices.service';

@Module({
  imports: [
    PrismaModule,
    InvoiceConfigsModule,
    UnitsModule,
    WarehouseTransactionsModule,
  ],
  controllers: [SalesReturnInvoicesController],
  providers: [SalesReturnInvoicesService],
  exports: [SalesReturnInvoicesService],
})
export class SalesReturnInvoicesModule {}
