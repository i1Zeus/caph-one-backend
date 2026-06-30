import { Prisma } from '@prisma/client';

export interface PrismaAuditMiddlewareOptions {
  excludeModels?: string[]; // Models to exclude from audit logging
  excludeActions?: Prisma.PrismaAction[]; // Actions to exclude from audit logging
  skipActionHistory?: boolean; // Skip logging for ActionHistory model to prevent recursion
}

/**
 * Creates Prisma middleware for automatic audit logging
 */
export function createPrismaAuditMiddleware(
  options: PrismaAuditMiddlewareOptions = {},
): any {
  const {
    excludeModels = [],
    excludeActions = [
      'findMany',
      'findFirst',
      'findUnique',
      'count',
      'aggregate',
      'groupBy',
    ],
    skipActionHistory = true,
  } = options;

  return async (params, next) => {
    // Skip if action is excluded
    if (excludeActions.includes(params.action)) {
      return next(params);
    }

    // Skip if model is excluded
    if (excludeModels.includes(params.model)) {
      return next(params);
    }

    // Skip ActionHistory to prevent recursion
    if (skipActionHistory && params.model === 'ActionHistory') {
      return next(params);
    }

    // Skip LoginEvent to prevent too much noise
    if (params.model === 'LoginEvent') {
      return next(params);
    }
    const startTime = Date.now();

    try {
      // For UPDATE and DELETE, get the original data first
      let originalData = null;
      if (
        (params.action === 'update' || params.action === 'delete') &&
        params.args.where
      ) {
        try {
          originalData = await getOriginalData(params, next);
        } catch (error) {
          console.error('Failed to get original data for audit:', error);
        }
      }

      // Execute the main query
      const result = await next(params);

      // Log the audit entry asynchronously to avoid blocking the main operation
      setImmediate(async () => {
        try {
          await logAuditEntry(params, result, originalData, startTime);
        } catch (error) {
          console.error('Prisma audit logging failed:', error);
        }
      });

      return result;
    } catch (error) {
      // Log failed operations too
      setImmediate(async () => {
        try {
          await logFailedAuditEntry(params, error, startTime);
        } catch (auditError) {
          console.error(
            'Failed to log audit for failed operation:',
            auditError,
          );
        }
      });

      throw error;
    }
  };
}

/**
 * Get original data before update/delete operations
 */
async function getOriginalData(params: any, next: any) {
  const findParams = {
    model: params.model,
    action: 'findUnique' as Prisma.PrismaAction,
    args: {
      where: params.args.where,
    },
  };

  return await next(findParams);
}

/**
 * Log audit entry for successful operations
 */
async function logAuditEntry(
  params: any,
  result: any,
  originalData: any,
  startTime: number,
) {
  const { PrismaClient } = await import('@prisma/client');
  const auditPrisma = new PrismaClient();

  try {
    const duration = Date.now() - startTime;
    const actionType = mapPrismaActionToAuditAction(params.action);
    const entityId = extractEntityId(params, result, originalData);
    const details: any = {
      operation: params.action,
      model: params.model,
      duration: `${duration}ms`,
    };

    // Add operation-specific details
    switch (params.action) {
      case 'create':
        details.data = sanitizeData(result);
        break;

      case 'update':
        details.changes = calculateChanges(originalData, result);
        details.newData = sanitizeData(result);
        if (originalData) {
          details.oldData = sanitizeData(originalData);
        }
        break;

      case 'delete':
        details.deletedData = sanitizeData(originalData || result);
        break;

      case 'upsert':
        details.data = sanitizeData(result);
        details.wasUpdate = !!originalData;
        break;

      default:
        details.data = sanitizeData(result);
        break;
    }

    if (entityId) {
      await auditPrisma.actionHistory.create({
        data: {
          actionType,
          entityType: params.model?.toUpperCase() || 'UNKNOWN',
          entityId,
          details,
          performedBy: null, // Will be null for Prisma middleware, service level should set this
        },
      });
    }
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
  } finally {
    await auditPrisma.$disconnect();
  }
}

/**
 * Log audit entry for failed operations
 */
async function logFailedAuditEntry(params: any, error: any, startTime: number) {
  const { PrismaClient } = await import('@prisma/client');
  const auditPrisma = new PrismaClient();

  try {
    const duration = Date.now() - startTime;
    const actionType = `${mapPrismaActionToAuditAction(params.action)}_FAILED`;

    await auditPrisma.actionHistory.create({
      data: {
        actionType,
        entityType: params.model?.toUpperCase() || 'UNKNOWN',
        entityId: 'unknown',
        details: {
          operation: params.action,
          model: params.model,
          duration: `${duration}ms`,
          error: error.message,
          args: sanitizeData(params.args),
        },
        performedBy: null,
      },
    });
  } catch (auditError) {
    console.error('Failed to log failed operation audit:', auditError);
  } finally {
    await auditPrisma.$disconnect();
  }
}

/**
 * Map Prisma actions to audit actions
 */
function mapPrismaActionToAuditAction(action: Prisma.PrismaAction): string {
  switch (action) {
    case 'create':
      return 'CREATE';
    case 'update':
      return 'UPDATE';
    case 'delete':
      return 'DELETE';
    case 'upsert':
      return 'UPSERT';
    case 'createMany':
      return 'CREATE_MANY';
    case 'updateMany':
      return 'UPDATE_MANY';
    case 'deleteMany':
      return 'DELETE_MANY';
    default:
      return action.toUpperCase();
  }
}

/**
 * Extract entity ID from operation
 */
function extractEntityId(
  params: any,
  result: any,
  originalData: any,
): string | null {
  // Try to get ID from result first (for create operations)
  if (result && typeof result === 'object' && result.id) {
    return result.id;
  }

  // Try to get ID from where clause (for update/delete operations)
  if (params.args.where && params.args.where.id) {
    return params.args.where.id;
  }

  // Try to get ID from original data
  if (originalData && originalData.id) {
    return originalData.id;
  }

  // For createMany or other bulk operations, return a special identifier
  if (
    params.action === 'createMany' ||
    params.action === 'updateMany' ||
    params.action === 'deleteMany'
  ) {
    return 'bulk_operation';
  }

  return null;
}

/**
 * Calculate changes between old and new data
 */
function calculateChanges(oldData: any, newData: any): any {
  if (!oldData || !newData) return {};

  const changes: any = {};

  Object.keys(newData).forEach((key) => {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        from: oldData[key],
        to: newData[key],
      };
    }
  });

  return changes;
}

/**
 * Remove sensitive data from audit logs
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  return data;
}
