import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_ACTION_KEY,
  AUTH_RESOURCE_KEY,
  AUTH_SKIP_KEY,
} from '../decorators/universal-auth.decorator';
import { DynamicPermissionsService } from '../services/dynamic-permissions.service';

@Injectable()
export class UniversalAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: DynamicPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if auth should be skipped
    const skipAuth = this.reflector.getAllAndOverride<boolean>(AUTH_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      return false; // No user, deny access
    }

    try {
      // Get resource and action
      const resource = this.getResource(context);
      const action = this.getAction(context, request.method);

      if (!resource || !action) {
        // If we can't determine resource/action, allow access for backward compatibility
        return true;
      }

      // Check if user has the required permission
      const hasPermission =
        await this.permissionsService.userHasResourcePermission(
          user.userId,
          resource,
          action,
        );

      console.log(
        `🔐 Auth Check: User ${user.userId} | ${resource}:${action} | ${hasPermission ? '✅ ALLOWED' : '❌ DENIED'}`,
      );

      return hasPermission;
    } catch (error) {
      console.error('Universal Auth Guard error:', error);
      return false; // Error occurred, deny access for security
    }
  }

  /**
   * Get resource name from controller
   */
  private getResource(context: ExecutionContext): string {
    // Check for explicit resource override
    const explicitResource = this.reflector.getAllAndOverride<string>(
      AUTH_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (explicitResource) {
      return explicitResource;
    }

    // Auto-detect from controller name
    const controllerName = context.getClass().name;

    // Remove 'Controller' suffix and convert to lowercase
    const resource = controllerName.replace(/Controller$/, '').toLowerCase();

    // Handle plural/singular conversion
    return this.normalizeResourceName(resource);
  }

  /**
   * Get action from method name or HTTP method
   */
  private getAction(context: ExecutionContext, httpMethod: string): string {
    // Check for explicit action override
    const explicitAction = this.reflector.getAllAndOverride<string>(
      AUTH_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (explicitAction) {
      return explicitAction;
    }

    const methodName = context.getHandler().name;

    // Method name to action mapping
    const methodActionMap: Record<string, string> = {
      // Create actions
      create: 'create',
      store: 'create',
      add: 'create',
      insert: 'create',
      post: 'create',

      // Read actions
      findAll: 'read',
      findOne: 'read',
      find: 'read',
      get: 'read',
      index: 'read',
      show: 'read',
      list: 'read',
      view: 'read',
      search: 'read',
      filter: 'read',

      // Update actions
      update: 'update',
      edit: 'update',
      patch: 'update',
      put: 'update',
      modify: 'update',
      change: 'update',

      // Delete actions
      remove: 'delete',
      delete: 'delete',
      destroy: 'delete',
      drop: 'delete',
    };

    // Check exact method name match
    if (methodActionMap[methodName]) {
      return methodActionMap[methodName];
    }

    // Check method name patterns
    if (
      this.methodStartsWith(methodName, [
        'create',
        'add',
        'insert',
        'new',
        'post',
      ])
    ) {
      return 'create';
    }

    if (
      this.methodStartsWith(methodName, [
        'get',
        'find',
        'list',
        'show',
        'view',
        'search',
        'filter',
        'fetch',
      ])
    ) {
      return 'read';
    }

    if (
      this.methodStartsWith(methodName, [
        'update',
        'edit',
        'modify',
        'change',
        'patch',
        'put',
      ])
    ) {
      return 'update';
    }

    if (
      this.methodStartsWith(methodName, ['delete', 'remove', 'destroy', 'drop'])
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

    return httpMethodActionMap[httpMethod] || 'read';
  }

  /**
   * Check if method name starts with any of the given prefixes
   */
  private methodStartsWith(methodName: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) =>
      methodName.toLowerCase().startsWith(prefix.toLowerCase()),
    );
  }

  /**
   * Normalize resource name (handle plurals, etc.)
   * Now completely dynamic - no hardcoded models!
   */
  private normalizeResourceName(resource: string): string {
    // Just return the resource as-is since we want it to be completely dynamic
    // The system will auto-create permissions for any resource that's accessed
    return resource;
  }
}
