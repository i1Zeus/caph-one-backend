import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';
import { RequirePermissions } from './permissions.decorator';
import { Roles } from './roles.decorator';

/**
 * Role-based authentication decorator (legacy support)
 */
export function Auth(...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), RolesGuard),
    Roles(...roles),
  );
}

/**
 * Permission-based authentication decorator
 */
export function AuthWithPermissions(...permissions: string[]) {
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), PermissionsGuard),
    RequirePermissions(...permissions),
  );
}

/**
 * Combined role and permission-based authentication decorator
 */
export function AuthWithRolesAndPermissions(
  roles: UserRole[],
  permissions: string[],
) {
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard),
    Roles(...roles),
    RequirePermissions(...permissions),
  );
}

/**
 * Simple authenticated access (no role or permission checks)
 */
export function AuthenticatedOnly() {
  return applyDecorators(UseGuards(AuthGuard('jwt')));
}
