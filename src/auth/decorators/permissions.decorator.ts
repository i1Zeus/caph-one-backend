import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permission decorator to specify required permissions for an endpoint
 * @param permissions - Array of permission strings (e.g., ['users:create', 'projects:read'])
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Resource-based permission decorator for common CRUD operations
 * @param resource - The resource name (e.g., 'users', 'projects')
 * @param actions - Array of actions (e.g., ['create', 'read', 'update', 'delete'])
 */
export const RequireResource = (resource: string, ...actions: string[]) => {
  const permissions = actions.map((action) => `${resource}:${action}`);
  return SetMetadata(PERMISSIONS_KEY, permissions);
};

/**
 * Shorthand decorators for common permission patterns
 */
export const CanCreate = (resource: string) =>
  RequireResource(resource, 'create');
export const CanRead = (resource: string) => RequireResource(resource, 'read');
export const CanUpdate = (resource: string) =>
  RequireResource(resource, 'update');
export const CanDelete = (resource: string) =>
  RequireResource(resource, 'delete');
export const CanManage = (resource: string) =>
  RequireResource(resource, 'create', 'read', 'update', 'delete');
