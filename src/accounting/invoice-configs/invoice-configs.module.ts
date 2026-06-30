import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoiceConfigsController } from './invoice-configs.controller';
import { InvoiceConfigsService } from './invoice-configs.service';

@Module({
  imports: [PrismaModule],
  controllers: [InvoiceConfigsController],
  providers: [InvoiceConfigsService],
  exports: [InvoiceConfigsService],
})
export class InvoiceConfigsModule {}
