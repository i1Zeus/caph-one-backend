import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';

// Decorator to mark controllers/methods for auto-audit
export const AutoAudit = (entityType: string) =>
  Reflect.metadata('audit:entityType', entityType);

// Decorator to skip audit for specific methods
export const SkipAutoAudit = () => Reflect.metadata('audit:skip', true);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    // const response = context.switchToHttp().getResponse();

    // Check if audit should be skipped
    const skipAudit = this.reflector.getAllAndOverride<boolean>('audit:skip', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAudit) {
      return next.handle();
    }

    // Extract audit information
    const httpMethod = request.method;
    const route = request.route?.path || request.url;
    const entityType = this.getEntityTypeFromRoute(context, route);
    const user = request.user;
    const performedBy = user?.userId || user?.id;

    // Only audit if we have user context and it's a relevant operation
    if (!performedBy || !entityType || !this.shouldAudit(httpMethod, route)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.handleSuccessfulOperation(
            httpMethod,
            route,
            entityType,
            request,
            data,
            performedBy,
            startTime,
          );
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      }),
      catchError(async (error) => {
        try {
          await this.handleFailedOperation(
            httpMethod,
            route,
            entityType,
            request,
            error,
            performedBy,
            startTime,
          );
        } catch (auditError) {
          console.error('Audit logging failed for error case:', auditError);
        }
        throw error;
      }),
    );
  }

  private getEntityTypeFromRoute(
    context: ExecutionContext,
    route: string,
  ): string | null {
    // First check for explicit decorator
    const decoratorEntityType = this.reflector.getAllAndOverride<string>(
      'audit:entityType',
      [context.getHandler(), context.getClass()],
    );

    if (decoratorEntityType) {
      return decoratorEntityType;
    }

    // Auto-detect from route patterns
    const routePatterns = {
      '/users': 'USER',
      '/tasks': 'TASK',
      '/projects': 'PROJECT',
      '/workspaces': 'WORKSPACE',
      '/task-stages': 'TASK_STAGE',
      '/project-stages': 'PROJECT_STAGE',
      '/comments': 'COMMENT',
    };

    for (const [pattern, entityType] of Object.entries(routePatterns)) {
      if (route.includes(pattern)) {
        return entityType;
      }
    }

    return null;
  }

  private shouldAudit(method: string, route: string): boolean {
    // Audit these HTTP methods
    const auditableMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    // Skip certain routes
    const skipRoutes = [
      '/auth/login',
      '/auth/logout',
      '/auth/refresh',
      '/audit/',
      '/health',
      '/status',
    ];

    return (
      auditableMethods.includes(method) &&
      !skipRoutes.some((skip) => route.includes(skip))
    );
  }

  private async handleSuccessfulOperation(
    method: string,
    route: string,
    entityType: string,
    request: any,
    responseData: any,
    performedBy: string,
    startTime: number,
  ): Promise<void> {
    const entityId = this.extractEntityId(request, responseData);
    const actionType = this.getActionType(method, route);
    const details = this.buildAuditDetails(
      method,
      request,
      responseData,
      startTime,
    );
    const metadata = this.buildMetadata(request, responseData, entityType);

    if (!entityId) {
      console.warn(
        `Could not extract entity ID for ${actionType} on ${entityType}`,
      );
      return;
    }

    switch (actionType) {
      case 'CREATE':
        await this.auditService.logCreate(
          entityType,
          entityId,
          details,
          performedBy,
          metadata,
        );
        break;
      case 'UPDATE':
        await this.auditService.logUpdate(
          entityType,
          entityId,
          {},
          details,
          performedBy,
          metadata,
        );
        break;
      case 'DELETE':
        await this.auditService.logDelete(
          entityType,
          entityId,
          details,
          performedBy,
          metadata,
        );
        break;
      case 'ASSIGN':
        await this.auditService.logAssign(
          entityType,
          entityId,
          details,
          performedBy,
          metadata,
        );
        break;
      default:
        await this.auditService.logCustomAction(
          actionType,
          entityType,
          entityId,
          details,
          performedBy,
          metadata,
        );
    }

    console.log(
      `✅ Auto-audit logged: ${actionType} ${entityType} ${entityId} by ${performedBy}`,
    );
  }

  private async handleFailedOperation(
    method: string,
    route: string,
    entityType: string,
    request: any,
    error: any,
    performedBy: string,
    startTime: number,
  ): Promise<void> {
    const actionType = this.getActionType(method, route);
    const details = {
      error: error.message,
      statusCode: error.status || 500,
      route,
      method,
      duration: Date.now() - startTime,
      requestBody: this.sanitizeData(request.body),
    };

    await this.auditService.logCustomAction(
      `${actionType}_FAILED`,
      entityType,
      'unknown',
      details,
      performedBy,
    );
  }

  private extractEntityId(request: any, responseData: any): string | null {
    // Try to get ID from response data first
    if (responseData?.id) {
      return responseData.id;
    }

    // Try to get ID from request params
    if (request.params?.id) {
      return request.params.id;
    }

    // For bulk operations, might need different handling
    if (
      Array.isArray(responseData) &&
      responseData.length > 0 &&
      responseData[0].id
    ) {
      return responseData[0].id;
    }

    return null;
  }

  private getActionType(method: string, route: string): string {
    // Check for specific action patterns in route
    if (route.includes('/assign') || route.includes('/members'))
      return 'ASSIGN';
    if (route.includes('/unassign') || route.includes('/remove-member'))
      return 'UNASSIGN';
    if (route.includes('/status')) return 'STATUS_UPDATE';
    if (route.includes('/priority')) return 'PRIORITY_UPDATE';
    if (route.includes('/reorder')) return 'REORDER';

    // Default based on HTTP method
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return method;
    }
  }

  private buildAuditDetails(
    method: string,
    request: any,
    responseData: any,
    startTime: number,
  ): any {
    const details: any = {
      method,
      route: request.route?.path || request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection?.remoteAddress,
      duration: Date.now() - startTime,
    };

    // Include relevant request data
    if (request.body && Object.keys(request.body).length > 0) {
      details.requestData = this.sanitizeData(request.body);
    }

    // Include relevant response data for CREATE operations
    if (method === 'POST' && responseData) {
      details.responseData = this.sanitizeData(responseData);
    }

    return details;
  }

  private buildMetadata(
    request: any,
    responseData: any,
    entityType: string,
  ): any {
    const metadata: any = {};

    // Extract workspace information
    if (request.body?.workspaceId) {
      metadata.workspaceId = request.body.workspaceId;
    } else if (request.query?.workspaceId) {
      metadata.workspaceId = request.query.workspaceId;
    } else if (responseData?.workspaceId) {
      metadata.workspaceId = responseData.workspaceId;
    } else if (responseData?.workspace?.id) {
      metadata.workspaceId = responseData.workspace.id;
    }

    // Extract workspace slug if available
    if (responseData?.workspace?.slug) {
      metadata.workspaceSlug = responseData.workspace.slug;
    } else if (request.body?.workspaceSlug) {
      metadata.workspaceSlug = request.body.workspaceSlug;
    }

    // Extract project information
    if (request.body?.projectId) {
      metadata.projectId = request.body.projectId;
    } else if (request.query?.projectId) {
      metadata.projectId = request.query.projectId;
    } else if (responseData?.projectId) {
      metadata.projectId = responseData.projectId;
    } else if (responseData?.project?.id) {
      metadata.projectId = responseData.project.id;
    }

    // Extract task information for comments
    if (entityType === 'COMMENT') {
      if (request.body?.taskId) {
        metadata.taskId = request.body.taskId;
      } else if (responseData?.taskId) {
        metadata.taskId = responseData.taskId;
      } else if (responseData?.task?.id) {
        metadata.taskId = responseData.task.id;
      }
    }

    // Extract lead information
    if (entityType === 'LEAD') {
      if (request.body?.stageId) {
        metadata.stageId = request.body.stageId;
      } else if (responseData?.stageId) {
        metadata.stageId = responseData.stageId;
      }
    }

    return metadata;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
