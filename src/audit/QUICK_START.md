# Audit System - Quick Start Guide

The audit system is now fully integrated into your DevHouse ERP backend! Here's how to start using it immediately.

## ✅ What's Already Done

- ✅ AuditModule added to AppModule
- ✅ Prisma middleware configured for automatic database-level logging
- ✅ Global interceptor active for all decorated methods
- ✅ API endpoints available at `/audit/*`
- ✅ ActionHistory model already exists in your schema

## 🚀 Start Using It Right Now

### 1. Test the API Endpoints (Available Now)

```bash
# Get recent audit activity across your system
GET /audit/history?limit=20

# Get audit statistics for the last 7 days
GET /audit/statistics?days=7

# View audit history for a specific entity
GET /audit/entity/USER/{user-id}?limit=10
```

### 2. Add Audit to Your Existing Services (2 minutes per service)

Pick any service (e.g., `UsersService`) and add these imports:

```typescript
// At the top of your service file
import { Audit, SkipAudit, AuditService } from '../audit';

// In the constructor
constructor(
  private prisma: PrismaService,
  private auditService: AuditService, // Add this line
  // ... other services
) {}
```

Then add decorators to methods:

```typescript
// For CREATE operations
@Audit({ action: 'CREATE', entity: 'USER' })
async create(createUserDto: CreateUserDto) {
  // Your existing code - no changes needed!
}

// For UPDATE operations
@Audit({ action: 'UPDATE', entity: 'USER', extractId: (args) => args[0] })
async update(id: string, updateUserDto: UpdateUserDto) {
  // Your existing code - no changes needed!
}

// For DELETE operations
@Audit({ action: 'DELETE', entity: 'USER', extractId: (args) => args[0] })
async remove(id: string) {
  // Your existing code - no changes needed!
}

// Skip audit for read operations
@SkipAudit()
async findAll() {
  // Your existing code
}
```

### 3. Try It Out Immediately

1. **Start your server**: `npm run start:dev`

2. **Create a user** (or any entity) via your API

3. **Check the audit log**:
   ```bash
   GET /audit/history?limit=5
   ```

You'll see the operation logged automatically! 🎉

## 📋 What Gets Logged Automatically

### Database Level (Already Active)

- All `create`, `update`, `delete` operations on any model
- Timing information and metadata
- Change tracking (old vs new values)

### Service Level (Add decorators as needed)

- More detailed context and user information
- Custom action types
- Business logic context

## 🎯 Quick Wins - Add These Decorators First

### UsersService

```typescript
@Audit({ action: 'CREATE', entity: 'USER' })
async create() { /* existing code */ }

@Audit({ action: 'UPDATE', entity: 'USER', extractId: (args) => args[0] })
async update(id: string) { /* existing code */ }

@Audit({ action: 'DELETE', entity: 'USER', extractId: (args) => args[0] })
async remove(id: string) { /* existing code */ }
```

### TasksService

```typescript
@Audit({ action: 'CREATE', entity: 'TASK' })
async create() { /* existing code */ }

@Audit({ action: 'UPDATE', entity: 'TASK', extractId: (args) => args[0] })
async update(id: string) { /* existing code */ }

@Audit({ action: 'DELETE', entity: 'TASK', extractId: (args) => args[0] })
async remove(id: string) { /* existing code */ }
```

### ProjectsService

```typescript
@Audit({ action: 'CREATE', entity: 'PROJECT' })
async create() { /* existing code */ }

@Audit({ action: 'UPDATE', entity: 'PROJECT', extractId: (args) => args[0] })
async update(id: string) { /* existing code */ }

@Audit({ action: 'DELETE', entity: 'PROJECT', extractId: (args) => args[0] })
async remove(id: string) { /* existing code */ }
```

## 📊 Dashboard Integration

Add audit stats to your dashboard by calling:

```typescript
// In your StatisticsService
async getDashboardStats() {
  const auditStats = await this.auditService.getAuditStatistics(30);

  return {
    // ... your existing stats
    auditActivity: {
      totalActions: auditStats.totalActions,
      actionsByType: auditStats.actionsByType,
      topUsers: auditStats.topUsers,
    }
  };
}
```

## 🔍 View Specific Entity History

Add endpoints to view audit history for specific entities:

```typescript
// In any controller
@Get(':id/audit-history')
@Auth(UserRole.ADMIN, UserRole.SUPER_ADMIN)
getAuditHistory(@Param('id') id: string) {
  return this.auditService.getEntityHistory('USER', id, 50);
}
```

## 🎨 Frontend Integration

Call these endpoints from your frontend:

```typescript
// Get recent activity for dashboard
const recentActivity = await api.get('/audit/history?limit=10');

// Get user's activity history
const userHistory = await api.get(`/audit/entity/USER/${userId}`);

// Get audit statistics for charts
const stats = await api.get('/audit/statistics?days=30');
```

## 🔒 Security Features (Already Active)

- Passwords, tokens, and secrets are automatically sanitized as `[REDACTED]`
- User context automatically captured from JWT tokens
- Failed operations are also logged
- All logging is asynchronous (won't slow down your app)

## 📈 Sample Audit Log Entry

```json
{
  "id": "clp1234567890",
  "actionType": "CREATE",
  "entityType": "USER",
  "entityId": "user-abc123",
  "details": {
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "EMPLOYEE",
      "password": "[REDACTED]"
    }
  },
  "performedBy": "admin-user-id",
  "createdAt": "2024-01-15T10:30:00Z",
  "user": {
    "name": "Admin User",
    "email": "admin@devhouse.com"
  }
}
```

## 🎯 Next Steps

1. **Test it now**: Hit `/audit/history` to see database-level logs
2. **Add decorators**: Start with your most critical services (Users, Projects, Tasks)
3. **Integrate with frontend**: Add audit history views to your admin dashboard
4. **Monitor**: Set up alerts for unusual activity patterns

## 🛠 Configuration Options

Exclude models from audit (if needed):

```typescript
// In PrismaService
this.$use(
  createPrismaAuditMiddleware({
    excludeModels: ['LoginEvent'], // Don't audit login events
  }),
);
```

The audit system is production-ready and won't impact your app's performance. Start using it now! 🚀
