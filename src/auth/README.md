# DevHouse ERP - Authentication & Authorization System

This directory contains a comprehensive role-based access control (RBAC) and permission-based access control system for the DevHouse ERP application.

## 🏗️ Architecture Overview

The auth system supports both **role-based** and **permission-based** access control:

- **Role-based**: Traditional approach where access is granted based on user roles
- **Permission-based**: Granular approach where access is granted based on specific permissions
- **Hybrid**: Combination of both role and permission checks

## 📁 Directory Structure

```
src/auth/
├── decorators/           # Authentication & authorization decorators
│   ├── auth.decorator.ts      # Main auth decorators
│   ├── permissions.decorator.ts # Permission-specific decorators
│   └── roles.decorator.ts     # Role-specific decorators
├── guards/              # Route guards for access control
│   ├── permissions.guard.ts   # Permission-based guard
│   └── roles.guard.ts         # Role-based guard
├── services/            # Business logic services
│   └── permissions.service.ts # Permission management service
├── seeders/             # Database seeders
│   └── permissions.seeder.ts  # Default permissions seeder
├── strategies/          # Passport authentication strategies
│   ├── jwt.strategy.ts        # JWT token strategy
│   └── local.strategy.ts      # Local username/password strategy
├── examples/            # Usage examples
│   └── auth-usage.example.ts  # Comprehensive usage examples
├── auth.controller.ts   # Authentication endpoints
├── auth.service.ts      # Authentication business logic
├── auth.module.ts       # Module configuration
├── index.ts            # Public API exports
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Database Setup

First, run the Prisma migration to create the permission tables:

```bash
npx prisma migrate dev
```

### 2. Seed Permissions

Seed the default permissions and role-permission mappings:

```bash
# Via API endpoint
POST /auth/permissions-seed

# Or programmatically
import { PermissionsSeeder } from './auth/seeders/permissions.seeder';
await permissionsSeeder.seedAll();
```

### 3. Basic Usage

```typescript
import { AuthWithPermissions, CanRead, CanCreate } from './auth';

@Controller('users')
export class UsersController {
  @Get()
  @CanRead('users')
  findAll() {
    // Only users with 'users:read' permission can access
  }

  @Post()
  @CanCreate('users')
  create(@Body() userData: any) {
    // Only users with 'users:create' permission can access
  }
}
```

## 🎯 Available Decorators

### Authentication Decorators

| Decorator                                          | Description              | Usage                                                              |
| -------------------------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `@Auth(...roles)`                                  | Role-based auth (legacy) | `@Auth(UserRole.ADMIN, UserRole.MANAGER)`                          |
| `@AuthWithPermissions(...permissions)`             | Permission-based auth    | `@AuthWithPermissions('users:read', 'users:update')`               |
| `@AuthWithRolesAndPermissions(roles, permissions)` | Combined auth            | `@AuthWithRolesAndPermissions([UserRole.ADMIN], ['users:create'])` |
| `@AuthenticatedOnly()`                             | Simple auth check        | `@AuthenticatedOnly()`                                             |

### Permission Decorators

| Decorator                                | Description                  | Usage                                                  |
| ---------------------------------------- | ---------------------------- | ------------------------------------------------------ |
| `@RequirePermissions(...permissions)`    | Require specific permissions | `@RequirePermissions('users:read', 'projects:update')` |
| `@RequireResource(resource, ...actions)` | Require resource actions     | `@RequireResource('users', 'read', 'update')`          |
| `@CanCreate(resource)`                   | Require create permission    | `@CanCreate('users')`                                  |
| `@CanRead(resource)`                     | Require read permission      | `@CanRead('users')`                                    |
| `@CanUpdate(resource)`                   | Require update permission    | `@CanUpdate('users')`                                  |
| `@CanDelete(resource)`                   | Require delete permission    | `@CanDelete('users')`                                  |
| `@CanManage(resource)`                   | Require all CRUD permissions | `@CanManage('users')`                                  |

## 🔐 Permission System

### Permission Format

Permissions follow the format: `resource:action`

Examples:

- `users:create` - Create users
- `projects:read` - Read projects
- `invoices:update` - Update invoices
- `admin:all` - Full administrative access

### Default Resources

The system includes permissions for these resources:

- `users` - User management
- `projects` - Project management
- `tasks` - Task management
- `workspaces` - Workspace management
- `leads` - Lead management
- `employees` - Employee management
- `accounts` - Account management
- `transactions` - Transaction management
- `invoices` - Invoice management
- `clients` - Client management
- `files` - File management
- `comments` - Comment management

### Special Permissions

- `admin:all` - Full administrative access
- `reports:view` - View reports
- `settings:manage` - Manage system settings
- `audit:view` - View audit logs

## 👥 Role Hierarchy

### Role Permissions Matrix

| Role                | Description           | Key Permissions                            |
| ------------------- | --------------------- | ------------------------------------------ |
| `SUPER_ADMIN`       | Full system access    | All permissions + `admin:all`              |
| `ADMIN`             | Administrative access | Most permissions except `admin:all`        |
| `DIRECTOR`          | Senior management     | Management + reporting permissions         |
| `MANAGER`           | Team management       | Team + project management                  |
| `EMPLOYEE`          | Basic user            | Read access + own tasks                    |
| `ACCOUNTANT`        | Financial management  | Accounting + financial permissions         |
| `HR`                | Human resources       | Employee + HR permissions                  |
| `SALES`             | Sales management      | Lead + client + sales permissions          |
| `SUPPORT`           | Customer support      | Read + update permissions                  |
| `PROCUREMENT`       | Purchasing            | Invoice + client + transaction permissions |
| `WAREHOUSE`         | Inventory management  | Basic file + comment permissions           |
| `DEVELOPER`         | Development team      | Project + task + file permissions          |
| `AUDITOR`           | Audit access          | Read-only + audit permissions              |
| `MARKETING_MANAGER` | Marketing             | Lead + client + marketing permissions      |
| `ACCOUNT_MANAGER`   | Account management    | Client + project + invoice permissions     |
| `DESIGNER`          | Design team           | Project + task + file permissions          |

## 🛠️ Services

### PermissionsService

The `PermissionsService` provides methods for managing permissions:

```typescript
import { PermissionsService } from './auth';

// Check if role has permission
await permissionsService.hasPermission(UserRole.MANAGER, 'users:read');

// Get all permissions for a role
const permissions = await permissionsService.getRolePermissions(
  UserRole.EMPLOYEE,
);

// Assign permissions to role
await permissionsService.assignPermissionsToRole(UserRole.CUSTOM, [
  'users:read',
  'projects:read',
]);

// Create new permission
await permissionsService.createPermission(
  'custom:action',
  'Custom action description',
);
```

## 📝 Usage Examples

### Basic Permission Check

```typescript
@Controller('projects')
export class ProjectsController {
  @Get()
  @CanRead('projects')
  findAll() {
    return this.projectsService.findAll();
  }

  @Post()
  @CanCreate('projects')
  create(@Body() projectData: CreateProjectDto) {
    return this.projectsService.create(projectData);
  }
}
```

### Multiple Permissions

```typescript
@Post('invoices')
@AuthWithPermissions('invoices:create', 'clients:read')
createInvoice(@Body() invoiceData: any) {
  // User needs both invoice creation AND client reading permissions
  return this.invoicesService.create(invoiceData);
}
```

### Combined Role and Permission

```typescript
@Get('sensitive-reports')
@AuthWithRolesAndPermissions([UserRole.DIRECTOR, UserRole.MANAGER], ['reports:view', 'audit:view'])
getSensitiveReports() {
  // User must be DIRECTOR or MANAGER AND have both report and audit permissions
  return this.reportsService.getSensitiveReports();
}
```

### Resource Management

```typescript
@Get('admin/users')
@CanManage('users')
manageUsers() {
  // User must have all user permissions: create, read, update, delete
  return this.usersService.getManagementInterface();
}
```

## 🔧 Configuration

### Adding New Permissions

1. **Via Service** (Recommended):

```typescript
await permissionsService.createPermission('custom:action', 'Description');
await permissionsService.assignPermissionsToRole(UserRole.MANAGER, [
  'custom:action',
]);
```

2. **Via Database Seeder**:
   Update `permissions.seeder.ts` and re-run the seeder.

### Custom Role Permissions

To modify role permissions, update the `getRolePermissionMap()` method in `permissions.seeder.ts`:

```typescript
[UserRole.CUSTOM_ROLE]: [
  'users:read',
  'projects:create',
  'projects:read',
  'projects:update',
  // ... other permissions
],
```

## 🚨 Security Notes

1. **SUPER_ADMIN Override**: `SUPER_ADMIN` role always has access, regardless of permission checks
2. **Permission Inheritance**: Permissions are not inherited between roles - each role has explicit permissions
3. **Database Integrity**: Use the seeder to maintain consistent permission assignments
4. **Soft Deletes**: Permissions use soft deletes (`isDeleted` flag) for audit trails

## 🧪 Testing

The `examples/auth-usage.example.ts` file contains comprehensive examples of all auth patterns. Use it as a reference for implementing auth in your controllers.

## 📚 Migration from Role-Only System

If you're migrating from a role-only system:

1. Keep existing `@Auth()` decorators for backward compatibility
2. Gradually replace with `@AuthWithPermissions()` for better granularity
3. Use `@AuthWithRolesAndPermissions()` for hybrid approaches
4. Run the permissions seeder to populate default permissions

## 🤝 Contributing

When adding new features:

1. Add appropriate permissions to the seeder
2. Update role-permission mappings
3. Add usage examples
4. Update this README

---

For more examples and advanced usage, see `examples/auth-usage.example.ts`.
