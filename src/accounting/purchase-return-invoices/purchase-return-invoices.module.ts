import { Module } from '@nestjs/common';
import { UnitsModule } from '../../inventory/units/units.module';
import { WarehouseTransactionsModule } from '../../inventory/warehouse-transactions/warehouse-transactions.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoiceConfigsModule } from '../invoice-configs/invoice-configs.module';
import { PurchaseReturnInvoicesController } from './purchase-return-invoices.controller';
import { PurchaseReturnInvoicesService } from './purchase-return-invoices.service';

@Module({
  imports: [
    PrismaModule,
    InvoiceConfigsModule,
    UnitsModule,
    WarehouseTransactionsModule,
  ],
  controllers: [PurchaseReturnInvoicesController],
  providers: [PurchaseReturnInvoicesService],
  exports: [PurchaseReturnInvoicesService],
})
export class PurchaseReturnInvoicesModule {}
