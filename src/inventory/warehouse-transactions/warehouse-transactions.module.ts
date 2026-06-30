import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarehouseTransactionsController } from './warehouse-transactions.controller';
import { WarehouseTransactionsService } from './warehouse-transactions.service';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseTransactionsController],
  providers: [WarehouseTransactionsService],
  exports: [WarehouseTransactionsService],
})
export class WarehouseTransactionsModule {}
