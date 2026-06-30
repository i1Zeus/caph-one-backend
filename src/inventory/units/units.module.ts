import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UnitCategoriesService } from './unit-categories.service';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  imports: [PrismaModule],
  controllers: [UnitsController],
  providers: [UnitsService, UnitCategoriesService],
  exports: [UnitsService, UnitCategoriesService],
})
export class UnitsModule {}
