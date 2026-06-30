import { Module } from '@nestjs/common';
import { UnitsModule } from '../../inventory/units/units.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoiceConfigsModule } from '../invoice-configs/invoice-configs.module';
import { PurchaseInvoicesController } from './purchase-invoices.controller';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@Module({
  imports: [PrismaModule, InvoiceConfigsModule, UnitsModule],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
  exports: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
