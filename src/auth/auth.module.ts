import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConstants } from '../../utils/constants';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionsController } from './controllers/permissions.controller';
import { RoleManagementController } from './controllers/role-management.controller';
import { RolesController } from './controllers/roles.controller';
import { DynamicPermissionsGuard } from './guards/dynamic-permissions.guard';
import { UniversalAuthGuard } from './guards/universal-auth.guard';
import { DatabaseModelsService } from './services/database-models.service';
import { DynamicPermissionsService } from './services/dynamic-permissions.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  controllers: [
    AuthController,
    RolesController,
    PermissionsController,
    RoleManagementController,
  ],
  imports: [
    forwardRef(() => UsersModule),
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    DynamicPermissionsGuard,
    UniversalAuthGuard,
    DynamicPermissionsService,
    DatabaseModelsService,
  ],
  exports: [
    DynamicPermissionsGuard,
    UniversalAuthGuard,
    DynamicPermissionsService,
    DatabaseModelsService,
  ],
})
export class AuthModule {}
