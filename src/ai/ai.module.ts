import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { TaskCreationAgent } from './agent/task-creation.agent';
import { TranscriptionAgent } from './agent/transcription.agent';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AiController],
  providers: [AiService, TranscriptionAgent, TaskCreationAgent],
})
export class AiModule {}
