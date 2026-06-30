# Audit System

A comprehensive audit logging system that automatically tracks all CRUD operations and custom actions across your NestJS application. This system integrates with your existing ActionHistory model to provide complete activity tracking.

## Features

- **Automatic Audit Logging**: Uses decorators and interceptors to automatically log operations
- **Prisma Middleware**: Database-level audit logging for all Prisma operations
- **Multiple Logging Levels**: Service-level decorators and database-level middleware
- **Flexible Configuration**: Exclude models, actions, or specific operations from audit
- **Security**: Automatically sanitizes sensitive data (passwords, tokens, etc.)
- **Performance**: Asynchronous logging to avoid blocking operations
- **Rich Metadata**: Tracks old values, new values, changes, and operation metadata

## Installation

The audit system is already integrated into your application. It's available as a global module.

## Usage

### 1. Service-Level Audit Decorators

Use decorators on your service methods to automatically log operations:

```typescript
import { Injectable } from '@nestjs/common';
import { Audit, SkipAudit } from '../audit';

@Injectable()
export class UsersService {
  // Automatically log user creation
  @Audit({ action: 'CREATE', entity: 'USER' })
  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({ data: createUserDto });
  }

  // Log updates with custom ID extraction
  @Audit({
    action: 'UPDATE',
    entity: 'USER',
    extractId: (args) => args[0], // First argument is user ID
  })
  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  // Log deletions
  @Audit({
    action: 'DELETE',
    entity: 'USER',
    extractId: (args) => args[0],
  })
  async remove(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // Skip audit for read operations
  @SkipAudit()
  async findAll() {
    return this.prisma.user.findMany();
  }
}
```

### 2. Manual Audit Logging

For complex operations or custom actions:

```typescript
import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit';

@Injectable()
export class TasksService {
  constructor(private auditService: AuditService) {}

  async assignTask(taskId: string, userId: string, assignedBy: string) {
    // Perform the operation
    const result = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        assignees: { connect: { id: userId } },
      },
    });

    // Manual audit logging
    await this.auditService.logAssign(
      'TASK',
      taskId,
      {
        assignedUserId: userId,
        assignedAt: new Date(),
      },
      assignedBy,
    );

    return result;
  }

  async bulkUpdateTasks(
    taskIds: string[],
    updateData: any,
    performedBy: string,
  ) {
    // Log bulk operation
    await this.auditService.logCustomAction(
      'BULK_UPDATE',
      'TASK',
      'bulk_operation',
      {
        taskIds,
        count: taskIds.length,
        updateData,
      },
      performedBy,
    );

    return this.prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: updateData,
    });
  }
}
```

### 3. Database-Level Audit (Automatic)

The Prisma middleware automatically logs all database operations. This catches operations that might not have service-level decorators.

```typescript
// This is automatically configured in PrismaService
// All create, update, delete operations are logged
await prisma.user.create({ data: userData }); // -> Logged as CREATE
await prisma.user.update({ where: { id }, data }); // -> Logged as UPDATE
await prisma.user.delete({ where: { id } }); // -> Logged as DELETE
```

## Available Decorators

### @Audit(options)

```typescript
@Audit({
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | string,
  entity: string,
  idField?: string, // Default: 'id'
  extractId?: (args: any[], result: any) => string
})
```

### @SkipAudit()

Skips audit logging for the decorated method.

## Audit Service Methods

```typescript
// Basic logging methods
await auditService.logCreate(entityType, entityId, data, performedBy);
await auditService.logUpdate(
  entityType,
  entityId,
  oldValues,
  newValues,
  performedBy,
);
await auditService.logDelete(entityType, entityId, deletedData, performedBy);
await auditService.logAssign(
  entityType,
  entityId,
  assignmentDetails,
  performedBy,
);

// Custom action logging
await auditService.logCustomAction(
  actionType,
  entityType,
  entityId,
  details,
  performedBy,
);

// Query methods
await auditService.getEntityHistory(entityType, entityId, limit);
await auditService.getRecentHistory(limit);
await auditService.getAuditStatistics(days);
```

## API Endpoints

The audit system provides REST endpoints for accessing audit data:

```bash
# Get recent audit history
GET /audit/history?limit=100

# Get audit history for specific entity
GET /audit/entity/USER/123abc?limit=50

# Get audit statistics
GET /audit/statistics?days=30

# Get audit logs by action type
GET /audit/actions/CREATE?limit=100

# Get audit logs by entity type
GET /audit/entities/USER?limit=100
```

## Configuration

### Exclude Models from Audit

```typescript
// In PrismaService
this.$use(
  createPrismaAuditMiddleware({
    excludeModels: ['LoginEvent', 'TempData'], // Don't audit these models
    skipActionHistory: true, // Prevent recursion
  }),
);
```

### Exclude Actions from Audit

```typescript
this.$use(
  createPrismaAuditMiddleware({
    excludeActions: ['findMany', 'findFirst', 'findUnique'], // Don't audit reads
  }),
);
```

## Best Practices

### 1. Use Decorators for Standard CRUD

```typescript
@Audit({ action: 'CREATE', entity: 'PROJECT' })
async create(createProjectDto: CreateProjectDto) {
  // Implementation
}
```

### 2. Manual Logging for Complex Operations

```typescript
async complexBusinessOperation(data: any, userId: string) {
  try {
    // Business logic
    const result = await this.performComplexOperation(data);

    // Manual audit
    await this.auditService.logCustomAction(
      'BUSINESS_OPERATION',
      'PROJECT',
      result.id,
      { operation: 'complex', data },
      userId
    );

    return result;
  } catch (error) {
    // Log failure
    await this.auditService.logCustomAction(
      'BUSINESS_OPERATION_FAILED',
      'PROJECT',
      'unknown',
      { error: error.message, data },
      userId
    );
    throw error;
  }
}
```

### 3. Bulk Operations

```typescript
async bulkDelete(ids: string[], performedBy: string) {
  await this.auditService.logCustomAction(
    'BULK_DELETE',
    'USER',
    'bulk_operation',
    { ids, count: ids.length },
    performedBy
  );

  return this.prisma.user.updateMany({
    where: { id: { in: ids } },
    data: { isDeleted: true }
  });
}
```

### 4. Import/Export Operations

```typescript
async importData(csvData: any[], performedBy: string) {
  const importId = `import_${Date.now()}`;

  await this.auditService.logCustomAction(
    'IMPORT_START',
    'USER',
    importId,
    { recordCount: csvData.length },
    performedBy
  );

  // Process import...

  await this.auditService.logCustomAction(
    'IMPORT_SUCCESS',
    'USER',
    importId,
    { successCount: results.length },
    performedBy
  );
}
```

## Data Sanitization

The audit system automatically removes sensitive fields:

- `password`
- `token`
- `secret`
- `key`
- `hash`

These fields are replaced with `[REDACTED]` in audit logs.

## Performance Considerations

- **Asynchronous Logging**: Audit logging doesn't block main operations
- **Minimal Overhead**: Database middleware uses `setImmediate` for non-blocking execution
- **Efficient Queries**: Audit queries are optimized and indexed
- **Configurable**: You can exclude high-frequency operations from audit

## Monitoring and Alerts

Use the audit statistics endpoint to monitor system activity:

```typescript
const stats = await auditService.getAuditStatistics(7); // Last 7 days
// Monitor for unusual activity patterns
```

## Integration with Existing Services

To add audit logging to existing services, simply:

1. Add the `@Audit()` decorator to methods you want to track
2. Inject `AuditService` for manual logging
3. Use `@SkipAudit()` for operations you don't want to track

Example integration:

```typescript
// Before
async updateProject(id: string, updateData: any) {
  return this.prisma.project.update({ where: { id }, data: updateData });
}

// After
@Audit({ action: 'UPDATE', entity: 'PROJECT', extractId: (args) => args[0] })
async updateProject(id: string, updateData: any) {
  return this.prisma.project.update({ where: { id }, data: updateData });
}
```

## Troubleshooting

### Common Issues

1. **Missing User Context**: Make sure user information is available in the request
2. **Recursion**: ActionHistory operations are automatically excluded
3. **Performance**: Use `@SkipAudit()` for high-frequency read operations
4. **Entity ID Extraction**: Provide custom `extractId` function for complex scenarios

### Debug Mode

Enable debug logging to see audit operations:

```typescript
// In your service
console.log('Audit operation:', { action, entity, id });
```

This audit system provides comprehensive activity tracking while maintaining performance and flexibility. It integrates seamlessly with your existing NestJS application and Prisma setup.
