import { Module, forwardRef } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { PosAnalyticsService } from './pos-analytics.service';
import { PosAuthService } from './pos-auth.service';
import { PosSessionsService } from './pos-sessions.service';
import { PosTerminalsService } from './pos-terminals.service';
import { PosService } from './pos.service';

// Controllers
import { PosAnalyticsController } from './pos-analytics.controller';
import { PosAuthController } from './pos-auth.controller';
import { PosSessionsController } from './pos-sessions.controller';
import { PosTerminalsController } from './pos-terminals.controller';
import { PosController } from './pos.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => AccountingModule)],
  controllers: [
    PosController,
    PosAuthController,
    PosTerminalsController,
    PosSessionsController,
    PosAnalyticsController,
  ],
  providers: [
    PosService,
    PosAuthService,
    PosTerminalsService,
    PosSessionsService,
    PosAnalyticsService,
  ],
  exports: [
    PosService,
    PosAuthService,
    PosTerminalsService,
    PosSessionsService,
    PosAnalyticsService,
  ],
})
export class PosModule {}
