import { Module } from '@nestjs/common';
import { UnitsModule } from '../../inventory/units/units.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoiceConfigsModule } from '../invoice-configs/invoice-configs.module';
import { SalesInvoicesController } from './sales-invoices.controller';
import { SalesInvoicesService } from './sales-invoices.service';

@Module({
  imports: [PrismaModule, InvoiceConfigsModule, UnitsModule],
  controllers: [SalesInvoicesController],
  providers: [SalesInvoicesService],
  exports: [SalesInvoicesService],
})
export class SalesInvoicesModule {}
