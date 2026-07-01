import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Check if the user is a super admin
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.role === 'SUPER_ADMIN' ||
      user.role?.toLowerCase() === 'super_admin';

    if (isSuperAdmin) {
      return true;
    }

    // Check if user has one of the required roles
    const hasRole = requiredRoles.some((role) => {
      const userRole = user.role?.toLowerCase() || '';
      return userRole === role.toLowerCase();
    });

    if (!hasRole) {
      throw new ForbiddenException(
        'Access denied. SuperAdmin privileges required.',
      );
    }

    return true;
  }
}
