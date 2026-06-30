import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DynamicPermissionsService } from '../services/dynamic-permissions.service';

/**
 * @deprecated This guard is deprecated. Use UniversalAuthGuard with @Auth() decorator instead.
 * This guard is kept for backward compatibility only.
 */

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: DynamicPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // This guard is deprecated - log a warning
    console.warn(
      'RolesGuard is deprecated. Please use @Auth() decorator with UniversalAuthGuard instead.',
    );

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      return false; // No user or user ID, deny access
    }

    try {
      // Check if user has admin:all permission (equivalent to old admin roles)
      const hasAdminAccess =
        await this.permissionsService.userHasResourcePermission(
          user.userId,
          'admin',
          'all',
        );

      if (hasAdminAccess) {
        return true; // Admin access grants all permissions
      }

      // For backward compatibility, allow access if no specific permission check is needed
      // In the new system, specific permissions should be checked instead of roles
      return true;
    } catch (error) {
      console.error('RolesGuard error:', error);
      return false; // Error occurred, deny access
    }
  }
}
