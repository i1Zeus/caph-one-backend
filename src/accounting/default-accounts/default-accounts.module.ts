import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DefaultAccountsController } from './default-accounts.controller';
import { DefaultAccountsService } from './default-accounts.service';

@Module({
  imports: [PrismaModule],
  controllers: [DefaultAccountsController],
  providers: [DefaultAccountsService],
  exports: [DefaultAccountsService],
})
export class DefaultAccountsModule {}
