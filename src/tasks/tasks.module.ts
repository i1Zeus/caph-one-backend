import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { TaskStagesController } from './task-stage/task-stages.controller';
import { TaskStagesService } from './task-stage/task-stages.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule, UsersModule, NotificationsModule, AuthModule],
  controllers: [TasksController, TaskStagesController, CommentsController],
  providers: [TasksService, TaskStagesService, CommentsService],
  exports: [TasksService, TaskStagesService, CommentsService],
})
export class TasksModule {}
