import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DisciplinaryActionsController } from './disciplinary-actions.controller';
import { DisciplinaryActionsService } from './disciplinary-actions.service';

@Module({
  imports: [PrismaModule],
  controllers: [DisciplinaryActionsController],
  providers: [DisciplinaryActionsService],
  exports: [DisciplinaryActionsService],
})
export class DisciplinaryActionsModule {}
