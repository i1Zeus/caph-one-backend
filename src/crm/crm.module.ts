import { Module } from '@nestjs/common';
import { WhatsAppModule } from '../notifications/whatsapp/whatsapp.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ActivitiesModule } from './activities/activities.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { LeadStagesController } from './lead-stage/lead-stages.controller';
import { LeadStagesService } from './lead-stage/lead-stages.service';
import { RealEstateModule } from './real-estate/real-estate.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    ActivitiesModule,
    RealEstateModule,
    WhatsAppModule,
  ],
  controllers: [CrmController, LeadStagesController],
  providers: [CrmService, LeadStagesService],
  exports: [CrmService, LeadStagesService, RealEstateModule],
})
export class CrmModule {}
