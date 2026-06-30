import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ActivitiesModule } from './activities/activities.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { LeadStagesController } from './lead-stage/lead-stages.controller';
import { LeadStagesService } from './lead-stage/lead-stages.service';

@Module({
  imports: [PrismaModule, UsersModule, ActivitiesModule],
  controllers: [CrmController, LeadStagesController],
  providers: [CrmService, LeadStagesService],
  exports: [CrmService, LeadStagesService],
})
export class CrmModule {}
