import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';

@Module({
  imports: [PrismaModule],
  controllers: [CurrenciesController],
  providers: [CurrenciesService],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
