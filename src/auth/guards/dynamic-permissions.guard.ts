import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DynamicPermissionsService } from '../services/dynamic-permissions.service';

// Metadata keys for decorators
export const PERMISSIONS_KEY = 'permissions';
export const RESOURCE_KEY = 'resource';
export const ACTION_KEY = 'action';
export const SKIP_PERMISSION_KEY = 'skip_permission';

@Injectable()
export class DynamicPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: DynamicPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if permission check should be skipped
    const skipPermission = this.reflector.getAllAndOverride<boolean>(
      SKIP_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      return false; // No user, deny access
    }

    try {
      // Method 1: Check for explicit permissions
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (requiredPermissions && requiredPermissions.length > 0) {
        return await this.permissionsService.userHasPermissions(
          user.userId,
          requiredPermissions,
        );
      }

      // Method 2: Check for resource + action combination
      const resource = this.reflector.getAllAndOverride<string>(RESOURCE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      const action = this.reflector.getAllAndOverride<string>(ACTION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (resource && action) {
        return await this.permissionsService.userHasResourcePermission(
          user.userId,
          resource,
          action,
        );
      }

      // Method 3: Auto-detect from controller and method names
      const controllerName = context
        .getClass()
        .name.replace('Controller', '')
        .toLowerCase();
      const methodName = context.getHandler().name;

      const autoDetectedAction = this.detectActionFromMethod(
        methodName,
        request.method,
      );

      if (autoDetectedAction) {
        return await this.permissionsService.userHasResourcePermission(
          user.userId,
          controllerName,
          autoDetectedAction,
        );
      }

      // If no permissions are specified and auto-detection fails, allow access
      // This maintains backward compatibility
      return true;
    } catch (error) {
      console.error('Permission check error:', error);
      return false; // Error occurred, deny access for security
    }
  }

  /**
   * Auto-detect action from method name and HTTP method
   */
  private detectActionFromMethod(
    methodName: string,
    httpMethod: string,
  ): string | null {
    // Direct method name mapping
    const methodActionMap: Record<string, string> = {
      create: 'create',
      store: 'create',
      findAll: 'read',
      findOne: 'read',
      find: 'read',
      get: 'read',
      index: 'read',
      show: 'read',
      update: 'update',
      edit: 'update',
      patch: 'update',
      remove: 'delete',
      delete: 'delete',
      destroy: 'delete',
    };

    // Check direct method name mapping first
    if (methodActionMap[methodName]) {
      return methodActionMap[methodName];
    }

    // Check method name patterns
    if (
      methodName.startsWith('create') ||
      methodName.startsWith('add') ||
      methodName.startsWith('new')
    ) {
      return 'create';
    }

    if (
      methodName.startsWith('get') ||
      methodName.startsWith('find') ||
      methodName.startsWith('list') ||
      methodName.startsWith('show')
    ) {
      return 'read';
    }

    if (
      methodName.startsWith('update') ||
      methodName.startsWith('edit') ||
      methodName.startsWith('modify')
    ) {
      return 'update';
    }

    if (
      methodName.startsWith('delete') ||
      methodName.startsWith('remove') ||
      methodName.startsWith('destroy')
    ) {
      return 'delete';
    }

    // Fallback to HTTP method mapping
    const httpMethodActionMap: Record<string, string> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };

    return httpMethodActionMap[httpMethod] || null;
  }
}
