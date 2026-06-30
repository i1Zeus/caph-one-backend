import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ACTION_KEY,
  DynamicPermissionsGuard,
  PERMISSIONS_KEY,
  RESOURCE_KEY,
  SKIP_PERMISSION_KEY,
} from '../guards/dynamic-permissions.guard';

/**
 * Simple authenticated access (no permission checks)
 */
export function Authenticated() {
  return applyDecorators(
    UseGuards(AuthGuard('jwt')),
    SetMetadata(SKIP_PERMISSION_KEY, true),
  );
}

/**
 * Require specific permissions
 * @param permissions - Array of permission strings (e.g., ['users:create', 'projects:read'])
 */
export function RequirePermissions(...permissions: string[]) {
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), DynamicPermissionsGuard),
    SetMetadata(PERMISSIONS_KEY, permissions),
  );
}

/**
 * Require permission for a specific resource and action
 * @param resource - The resource name (e.g., 'users', 'projects')
 * @param action - The action (e.g., 'create', 'read', 'update', 'delete')
 */
export function RequireResourcePermission(resource: string, action: string) {
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), DynamicPermissionsGuard),
    SetMetadata(RESOURCE_KEY, resource),
    SetMetadata(ACTION_KEY, action),
  );
}

/**
 * Auto-detect permissions based on controller name and method
 * This is the most convenient decorator for standard CRUD operations
 */
export function Protected() {
  return applyDecorators(UseGuards(AuthGuard('jwt'), DynamicPermissionsGuard));
}

/**
 * Skip permission checks (for authenticated-only endpoints)
 */
export function SkipPermissions() {
  return applyDecorators(
    UseGuards(AuthGuard('jwt')),
    SetMetadata(SKIP_PERMISSION_KEY, true),
  );
}

// ===== CRUD SHORTHAND DECORATORS =====

/**
 * Require create permission for the resource
 * @param resource - Optional resource name (auto-detected from controller if not provided)
 */
export function CanCreate(resource?: string) {
  if (resource) {
    return RequireResourcePermission(resource, 'create');
  }
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), DynamicPermissionsGuard),
    SetMetadata(ACTION_KEY, 'create'),
  );
}

/**
 * Require read permission for the resource
 * @param resource - Optional resource name (auto-detected from controller if not provided)
 */
export function CanRead(resource?: string) {
  if (resource) {
    return RequireResourcePermission(resource, 'read');
  }
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), DynamicPermissionsGuard),
    SetMetadata(ACTION_KEY, 'read'),
  );
}

/**
 * Require update permission for the resource
 * @param resource - Optional resource name (auto-detected from controller if not provided)
 */
export function CanUpdate(resource?: string) {
  if (resource) {
    return RequireResourcePermission(resource, 'update');
  }
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), DynamicPermissionsGuard),
    SetMetadata(ACTION_KEY, 'update'),
  );
}

/**
 * Require delete permission for the resource
 * @param resource - Optional resource name (auto-detected from controller if not provided)
 */
export function CanDelete(resource?: string) {
  if (resource) {
    return RequireResourcePermission(resource, 'delete');
  }
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), DynamicPermissionsGuard),
    SetMetadata(ACTION_KEY, 'delete'),
  );
}

/**
 * Require all CRUD permissions for the resource
 * @param resource - The resource name
 */
export function CanManage(resource: string) {
  return RequirePermissions(
    `${resource}:create`,
    `${resource}:read`,
    `${resource}:update`,
    `${resource}:delete`,
  );
}

// ===== BUSINESS-SPECIFIC DECORATORS =====

/**
 * Admin-only access (requires admin:all permission)
 */
export function AdminOnly() {
  return RequirePermissions('admin:all');
}

/**
 * Manager-level access (requires management permissions)
 */
export function ManagerAccess() {
  return RequirePermissions('reports:view', 'settings:manage');
}

/**
 * Financial access (requires accounting permissions)
 */
export function FinancialAccess() {
  return RequirePermissions(
    'accounts:read',
    'transactions:read',
    'invoices:read',
  );
}

/**
 * HR access (requires employee management permissions)
 */
export function HRAccess() {
  return RequirePermissions('employees:read', 'employees:update');
}

/**
 * Sales access (requires lead and client permissions)
 */
export function SalesAccess() {
  return RequirePermissions('leads:read', 'clients:read');
}
