import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { DynamicPermissionsService } from '../services/dynamic-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: DynamicPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      return false; // No user, deny access
    }

    try {
      // Admin override
      const isAdmin = await this.permissionsService.userHasResourcePermission(
        user.userId,
        'admin',
        'all',
      );
      if (isAdmin) return true;

      // Check if user has all required permissions
      const hasPermissions = await this.permissionsService.userHasPermissions(
        user.userId,
        requiredPermissions,
      );

      return hasPermissions;
    } catch (error) {
      console.error('Permission check error:', error);
      return false; // Error occurred, deny access for security
    }
  }
}
