# DevHouse ERP - Dynamic Role-Permission System

This is a completely flexible, database-driven role and permission system where:

- **Roles are dynamic** - Create, modify, and delete roles through the API
- **Permissions are granular** - Fine-grained control over every resource and action
- **User assignment is flexible** - Assign multiple roles to any user
- **Auto-detection is smart** - Guards automatically detect permissions from controller/method names

## 🏗️ System Architecture

```
User ←→ UserRole ←→ Role ←→ RolePermission ←→ Permission
```

- **User**: Can have multiple roles
- **Role**: Dynamic roles (Admin, Manager, Sales Rep, etc.)
- **Permission**: Granular permissions (users:create, projects:read, etc.)
- **Relationships**: Many-to-many between users-roles and roles-permissions

## 🚀 Quick Start

### 1. Database Migration

```bash
cd devhouse-erp-backend
npx prisma migrate dev --name add-dynamic-roles-system
npx prisma generate
```

### 2. Seed System

```bash
# Create admin user + seed permissions and roles
POST /auth/admin-seed

# Or just seed permissions and roles
POST /auth/permissions-seed
```

### 3. Basic Usage

```typescript
import { Protected, CanCreate, RequirePermissions } from './auth';

@Controller('users')
export class UsersController {
  @Get()
  @Protected() // Auto-detects: users:read
  findAll() {}

  @Post()
  @CanCreate() // Requires: users:create
  create() {}

  @Get('reports')
  @RequirePermissions('users:read', 'reports:view')
  getReports() {} // Requires both permissions
}
```

## 🎯 Available Decorators

### Core Decorators

| Decorator                                      | Description             | Example                                             |
| ---------------------------------------------- | ----------------------- | --------------------------------------------------- |
| `@Protected()`                                 | Auto-detect permissions | `@Protected()` → `users:read`                       |
| `@Authenticated()`                             | Just authentication     | `@Authenticated()`                                  |
| `@RequirePermissions(...perms)`                | Explicit permissions    | `@RequirePermissions('users:create', 'roles:read')` |
| `@RequireResourcePermission(resource, action)` | Resource + action       | `@RequireResourcePermission('users', 'create')`     |
| `@SkipPermissions()`                           | Skip permission checks  | `@SkipPermissions()`                                |

### CRUD Shortcuts

| Decorator              | Permission           | Usage                                   |
| ---------------------- | -------------------- | --------------------------------------- |
| `@CanCreate()`         | `{resource}:create`  | `@CanCreate()` or `@CanCreate('users')` |
| `@CanRead()`           | `{resource}:read`    | `@CanRead()` or `@CanRead('users')`     |
| `@CanUpdate()`         | `{resource}:update`  | `@CanUpdate()` or `@CanUpdate('users')` |
| `@CanDelete()`         | `{resource}:delete`  | `@CanDelete()` or `@CanDelete('users')` |
| `@CanManage(resource)` | All CRUD permissions | `@CanManage('users')`                   |

### Business Shortcuts

| Decorator            | Required Permissions                                  | Use Case            |
| -------------------- | ----------------------------------------------------- | ------------------- |
| `@AdminOnly()`       | `admin:all`                                           | Super admin only    |
| `@ManagerAccess()`   | `reports:view`, `settings:manage`                     | Management features |
| `@FinancialAccess()` | `accounts:read`, `transactions:read`, `invoices:read` | Accounting          |
| `@HRAccess()`        | `employees:read`, `employees:update`                  | HR features         |
| `@SalesAccess()`     | `leads:read`, `clients:read`                          | Sales features      |

## 🔐 Permission System

### Permission Format

All permissions follow: `resource:action`

**Examples:**

- `users:create` - Create users
- `projects:read` - Read projects
- `invoices:update` - Update invoices
- `admin:all` - Full admin access

### Auto-Detection Rules

The `@Protected()` decorator automatically detects permissions:

1. **Controller Name** → Resource
   - `UsersController` → `users`
   - `ProjectsController` → `projects`

2. **Method Name** → Action
   - `findAll()`, `getUsers()` → `read`
   - `create()`, `store()` → `create`
   - `update()`, `edit()` → `update`
   - `remove()`, `delete()` → `delete`

3. **HTTP Method** → Action (fallback)
   - `GET` → `read`
   - `POST` → `create`
   - `PUT/PATCH` → `update`
   - `DELETE` → `delete`

## 📊 Role Management API

### Roles Endpoints

```typescript
// Get all roles
GET /roles

// Get role by ID
GET /roles/:id

// Create role
POST /roles
{
  "name": "Sales Manager",
  "description": "Manages sales team",
  "color": "#2196f3"
}

// Update role
PUT /roles/:id

// Delete role
DELETE /roles/:id

// Get role permissions
GET /roles/:id/permissions

// Assign permissions to role
POST /roles/:id/permissions
{
  "permissionIds": ["perm-id-1", "perm-id-2"]
}

// Add permissions to role
POST /roles/:id/permissions/add

// Remove permissions from role
DELETE /roles/:id/permissions
```

### User-Role Assignment

```typescript
// Assign roles to user
POST /roles/assign-to-user/:userId
{
  "roleIds": ["role-id-1", "role-id-2"]
}

// Add roles to user
POST /roles/add-to-user/:userId

// Remove roles from user
DELETE /roles/remove-from-user/:userId

// Get user roles
GET /roles/user/:userId

// Get user permissions
GET /roles/user/:userId/permissions
```

### Permissions Endpoints

```typescript
// Get all permissions
GET /permissions

// Get permissions grouped by resource
GET /permissions/by-resource

// Create permission
POST /permissions
{
  "name": "custom:action",
  "description": "Custom action description"
}

// Seed default permissions and roles
POST /permissions/seed
```

## 💡 Usage Examples

### Example 1: Auto-Detection

```typescript
@Controller('projects')
export class ProjectsController {
  @Get()
  @Protected() // Auto-detects: projects:read
  findAll() {
    return this.projectsService.findAll();
  }

  @Post()
  @Protected() // Auto-detects: projects:create
  create(@Body() data: any) {
    return this.projectsService.create(data);
  }
}
```

### Example 2: Explicit Permissions

```typescript
@Controller('invoices')
export class InvoicesController {
  @Post()
  @RequirePermissions('invoices:create', 'clients:read')
  create(@Body() data: any) {
    // User needs BOTH permissions
    return this.invoicesService.create(data);
  }

  @Get('reports')
  @RequirePermissions('invoices:read', 'reports:view', 'audit:view')
  getReports() {
    // User needs ALL three permissions
    return this.invoicesService.getReports();
  }
}
```

### Example 3: Mixed Approaches

```typescript
@Controller('employees')
export class EmployeesController {
  @Get()
  @HRAccess() // Business shortcut
  findAll() {}

  @Post()
  @RequirePermissions('employees:create', 'users:create')
  create(@Body() data: any) {} // Explicit permissions

  @Get(':id')
  @CanRead() // CRUD shortcut: employees:read
  findOne(@Param('id') id: string) {}

  @Delete(':id')
  @CanDelete('employees') // Explicit resource
  remove(@Param('id') id: string) {}
}
```

### Example 4: Admin Features

```typescript
@Controller('admin')
export class AdminController {
  @Get('dashboard')
  @AdminOnly() // Requires: admin:all
  getDashboard() {}

  @Post('backup')
  @AdminOnly()
  createBackup() {}

  @Get('users-with-roles')
  @RequirePermissions('users:read', 'roles:read')
  getUsersWithRoles() {}
}
```

## 🔧 Role Management Workflow

### 1. Create a Role

```typescript
// Create role
const role = await dynamicPermissionsService.createRole({
  name: 'Sales Manager',
  description: 'Manages sales team and processes',
  color: '#2196f3',
});
```

### 2. Assign Permissions to Role

```typescript
// Get permission IDs
const permissions = await dynamicPermissionsService.getAllPermissions();
const salesPermissions = permissions
  .filter((p) => ['leads', 'clients', 'invoices'].includes(p.resource))
  .map((p) => p.id);

// Assign permissions
await dynamicPermissionsService.assignPermissionsToRole(
  role.id,
  salesPermissions,
);
```

### 3. Assign Role to User

```typescript
// Assign role to user
await dynamicPermissionsService.assignRolesToUser(userId, [role.id]);
```

### 4. Check User Permissions

```typescript
// Check if user has permission
const hasPermission = await dynamicPermissionsService.userHasPermission(
  userId,
  'leads:create',
);

// Get all user permissions
const userPermissions =
  await dynamicPermissionsService.getUserPermissions(userId);
```

## 🛡️ Security Features

### 1. Multiple Permission Checks

```typescript
@RequirePermissions('users:read', 'roles:read', 'audit:view')
// User must have ALL three permissions
```

### 2. Cross-Resource Permissions

```typescript
@RequirePermissions('invoices:create', 'clients:read', 'accounts:update')
// User needs permissions across multiple resources
```

### 3. Admin Override

- Users with `admin:all` permission bypass all other checks
- System roles cannot be deleted
- Soft deletes maintain audit trails

### 4. Flexible Assignment

- Users can have multiple roles
- Roles can have any combination of permissions
- Permissions are additive (user gets union of all role permissions)

## 📈 Default System Setup

### Default Roles Created

1. **Super Admin** - Full system access (`admin:all` + all permissions)
2. **Admin** - Administrative access (most permissions)
3. **Manager** - Management access (team + reporting permissions)
4. **Employee** - Basic access (read permissions + own tasks)

### Default Permissions Created

For each resource: `create`, `read`, `update`, `delete`

**Resources:**

- `users`, `projects`, `tasks`, `workspaces`
- `leads`, `employees`, `accounts`, `transactions`
- `invoices`, `clients`, `files`, `comments`
- `roles`, `permissions`, `reports`, `settings`, `audit`

**Special Permissions:**

- `admin:all` - Full administrative access
- `reports:view` - View reports
- `settings:manage` - Manage system settings
- `audit:view` - View audit logs

## 🔄 Migration from Static Roles

If migrating from the old enum-based system:

1. **Run the migration** to create new tables
2. **Seed the system** with default roles and permissions
3. **Assign roles to existing users** based on their old enum roles
4. **Update controllers** to use new decorators
5. **Test thoroughly** before removing old system

## 🧪 Testing

```typescript
// Test permission checking
const canCreate = await dynamicPermissionsService.userHasPermission(
  userId,
  'users:create',
);

// Test multiple permissions
const canManageUsers = await dynamicPermissionsService.userHasPermissions(
  userId,
  ['users:create', 'users:read', 'users:update', 'users:delete'],
);

// Test resource permission
const canReadProjects =
  await dynamicPermissionsService.userHasResourcePermission(
    userId,
    'projects',
    'read',
  );
```

## 🎯 Best Practices

1. **Use Auto-Detection** for standard CRUD operations
2. **Use Explicit Permissions** for complex business logic
3. **Group Related Permissions** in business-specific decorators
4. **Test Permission Changes** thoroughly before deployment
5. **Document Custom Permissions** for your team
6. **Use Descriptive Role Names** that match job functions
7. **Regular Permission Audits** to ensure security

---

This dynamic system provides ultimate flexibility while maintaining security and ease of use. The auto-detection feature makes it simple to protect endpoints, while explicit permissions give you fine-grained control when needed.
