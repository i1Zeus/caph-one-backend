# Universal Dynamic Auth System

This is the **ultimate flexible auth system** where everything is completely dynamic and auto-detected. No hardcoding, no static roles, just pure dynamic permission checking.

## 🎯 Core Concept

**One decorator to rule them all:** `@Auth()`

- **Auto-detects resource** from controller name (`ProjectsController` → `projects`)
- **Auto-detects action** from method name or HTTP method
- **Checks permissions dynamically** against user's roles in database
- **Zero hardcoding** - everything is determined at runtime

## 🚀 Quick Start

### 1. Basic Usage (Auto-Detection)

```typescript
@Controller('projects')
export class ProjectsController {
  @Get()
  @Auth() // Auto-detects: projects:read
  findAll() {}

  @Post()
  @Auth() // Auto-detects: projects:create
  create() {}

  @Patch(':id')
  @Auth() // Auto-detects: projects:update
  update() {}

  @Delete(':id')
  @Auth() // Auto-detects: projects:delete
  remove() {}
}
```

### 2. Explicit Overrides

```typescript
@Controller('projects')
export class ProjectsController {
  @Post('reorder')
  @Auth('update') // Explicit action: projects:update
  reorder() {}

  @Get('user-projects')
  @Auth('read', 'users') // Explicit: users:read
  getUserProjects() {}
}
```

### 3. Special Cases

```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  @Public() // No auth needed
  login() {}

  @Get('profile')
  @AuthOnly() // Just authentication, no permissions
  getProfile() {}
}
```

## 🔍 Auto-Detection Rules

### Resource Detection

- Controller name minus 'Controller' suffix
- `ProjectsController` → `projects`
- `UsersController` → `users`
- `AuthController` → `auth`

### Action Detection

**1. Method Name Patterns:**

```typescript
// CREATE actions
create() → 'create'
store() → 'create'
add() → 'create'

// READ actions
findAll() → 'read'
findOne() → 'read'
get() → 'read'
show() → 'read'

// UPDATE actions
update() → 'update'
edit() → 'update'
patch() → 'update'

// DELETE actions
remove() → 'delete'
delete() → 'delete'
destroy() → 'delete'
```

**2. HTTP Method Fallback:**

```typescript
GET → 'read'
POST → 'create'
PUT/PATCH → 'update'
DELETE → 'delete'
```

## 📋 Complete Examples

### Users Controller

```typescript
@Controller('users')
export class UsersController {
  @Get()
  @Auth() // users:read
  findAll() {}

  @Get(':id')
  @Auth() // users:read
  findOne() {}

  @Post()
  @Auth() // users:create
  create() {}

  @Patch(':id')
  @Auth() // users:update
  update() {}

  @Delete(':id')
  @Auth() // users:delete
  remove() {}

  @Post(':id/roles')
  @Auth('update') // users:update (explicit)
  assignRoles() {}

  @Get('reports')
  @Auth('read', 'reports') // reports:read (cross-resource)
  getUserReports() {}
}
```

### Tasks Controller

```typescript
@Controller('tasks')
export class TasksController {
  @Get()
  @Auth() // tasks:read
  findAll() {}

  @Post()
  @Auth() // tasks:create
  create() {}

  @Patch(':id/complete')
  @Auth('update') // tasks:update
  markComplete() {}

  @Post(':id/assign')
  @Auth('update') // tasks:update
  assignToUser() {}
}
```

### Invoices Controller

```typescript
@Controller('invoices')
export class InvoicesController {
  @Get()
  @Auth() // invoices:read
  findAll() {}

  @Post()
  @Auth() // invoices:create
  create() {}

  @Post(':id/send')
  @Auth('update') // invoices:update
  sendInvoice() {}

  @Get('reports')
  @Auth('read', 'reports') // reports:read
  getInvoiceReports() {}
}
```

## 🎛️ Available Decorators

| Decorator                 | Usage                    | Description                           |
| ------------------------- | ------------------------ | ------------------------------------- |
| `@Auth()`                 | `@Auth()`                | Auto-detect resource and action       |
| `@Auth(action)`           | `@Auth('update')`        | Auto-detect resource, explicit action |
| `@Auth(action, resource)` | `@Auth('read', 'users')` | Explicit resource and action          |
| `@Public()`               | `@Public()`              | No authentication needed              |
| `@AuthOnly()`             | `@AuthOnly()`            | Authentication only, no permissions   |

## 🔧 How It Works

### 1. Request Flow

```
Request → JWT Auth → Universal Guard → Permission Check → Allow/Deny
```

### 2. Permission Check Process

```typescript
// Example: GET /projects/123
Controller: ProjectsController → Resource: 'projects'
Method: findOne() → Action: 'read'
Required Permission: 'projects:read'

// Check user permissions
const hasPermission = await permissionsService.userHasResourcePermission(
  userId,
  'projects',
  'read'
);
```

### 3. Database Query

```sql
-- Check if user has projects:read permission
SELECT p.name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.id = ? AND p.name = 'projects:read'
```

## 🎯 Real-World Usage

### 1. Standard CRUD Controller

```typescript
@Controller('employees')
export class EmployeesController {
  @Get()
  @Auth() // employees:read
  findAll() {}

  @Post()
  @Auth() // employees:create
  create(@Body() data: CreateEmployeeDto) {}

  @Get(':id')
  @Auth() // employees:read
  findOne(@Param('id') id: string) {}

  @Patch(':id')
  @Auth() // employees:update
  update(@Param('id') id: string, @Body() data: UpdateEmployeeDto) {}

  @Delete(':id')
  @Auth() // employees:delete
  remove(@Param('id') id: string) {}
}
```

### 2. Complex Business Logic

```typescript
@Controller('projects')
export class ProjectsController {
  @Get()
  @Auth() // projects:read
  findAll() {}

  @Post()
  @Auth() // projects:create
  create() {}

  @Post(':id/contributors')
  @Auth('update') // projects:update (managing contributors)
  addContributors() {}

  @Post(':id/archive')
  @Auth('update') // projects:update (archiving)
  archive() {}

  @Post('bulk-delete')
  @Auth('delete') // projects:delete
  bulkDelete() {}

  @Get('reports')
  @Auth('read', 'reports') // reports:read (different resource)
  getProjectReports() {}
}
```

### 3. Mixed Permissions

```typescript
@Controller('files')
export class FilesController {
  @Get()
  @Auth() // files:read
  findAll() {}

  @Post('upload')
  @Auth() // files:create
  upload() {}

  @Post(':id/share')
  @Auth('update') // files:update
  shareFile() {}

  @Get('system')
  @Auth('read', 'admin') // admin:read (system files)
  getSystemFiles() {}
}
```

## 🛠️ Setup Instructions

### 1. Seed the System

```bash
POST /auth/admin-seed
```

### 2. Create Roles

```bash
POST /roles
{
  "name": "Project Manager",
  "description": "Manages projects and teams"
}
```

### 3. Assign Permissions to Role

```bash
POST /roles/:roleId/permissions
{
  "permissionIds": ["projects:create", "projects:read", "projects:update", "users:read"]
}
```

### 4. Assign Role to User

```bash
POST /roles/assign-to-user/:userId
{
  "roleIds": ["role-id-here"]
}
```

### 5. Test Endpoints

```bash
# User with projects:read can access
GET /projects

# User without projects:create cannot access
POST /projects
```

## 🎨 Permission Patterns

### Standard CRUD

- `resource:create` - Create new records
- `resource:read` - View/list records
- `resource:update` - Modify records
- `resource:delete` - Remove records

### Business Actions

- `projects:update` - Manage contributors, archive, etc.
- `invoices:update` - Send, approve, etc.
- `users:update` - Assign roles, change status, etc.

### Cross-Resource

- `reports:read` - View reports from any controller
- `admin:read` - Admin-only data access
- `audit:view` - Audit trail access

## 🔍 Debugging

The guard logs every permission check:

```
🔐 Auth Check: User abc123 | projects:read | ✅ ALLOWED
🔐 Auth Check: User def456 | projects:create | ❌ DENIED
```

### Check User Permissions

```bash
GET /auth/my-permissions
# Returns user's roles and permissions

POST /auth/test-permission
{
  "resource": "projects",
  "action": "create"
}
# Tests specific permission
```

## 🎯 Benefits

1. **Zero Hardcoding** - No static roles in code
2. **Auto-Detection** - Minimal decorator usage
3. **Flexible** - Override when needed
4. **Scalable** - Works with any number of resources
5. **Maintainable** - Single source of truth in database
6. **Debuggable** - Clear logging and testing endpoints

## 🚀 Migration from Old System

### Before (Static Roles)

```typescript
@Auth(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
```

### After (Dynamic Permissions)

```typescript
@Auth() // Auto-detects permission needed
```

The new system is **infinitely more flexible** - you can create any role with any combination of permissions through the API, without touching code!

---

**This is the ultimate auth system** - completely dynamic, zero hardcoding, maximum flexibility. Just use `@Auth()` and let the system figure out what permission is needed!
