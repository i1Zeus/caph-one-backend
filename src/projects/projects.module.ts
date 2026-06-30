import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ProjectStagesController } from './project-stage/project-stages.controller';
import { ProjectStagesService } from './project-stage/project-stages.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [ProjectsController, ProjectStagesController],
  providers: [ProjectsService, ProjectStagesService],
  exports: [ProjectsService, ProjectStagesService],
})
export class ProjectsModule {}
