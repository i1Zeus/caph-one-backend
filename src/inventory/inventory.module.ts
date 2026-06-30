import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { UnitsModule } from './units/units.module';
import { WarehouseTransactionsModule } from './warehouse-transactions/warehouse-transactions.module';
import { WarehousesModule } from './warehouses/warehouses.module';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    UnitsModule,
    WarehousesModule,
    StockModule,
    WarehouseTransactionsModule,
    CategoriesModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [
    InventoryService,
    ProductsModule,
    UnitsModule,
    WarehousesModule,
    StockModule,
    WarehouseTransactionsModule,
    CategoriesModule,
  ],
})
export class InventoryModule {}
