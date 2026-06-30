import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  AdminOnly,
  Authenticated,
  CanCreate,
  CanManage,
  CanRead,
  FinancialAccess,
  HRAccess,
  ManagerAccess,
  Protected,
  RequirePermissions,
  RequireResourcePermission,
  SalesAccess,
  SkipPermissions,
} from '../decorators/dynamic-auth.decorator';

// ===== EXAMPLE 1: USERS CONTROLLER WITH AUTO-DETECTION =====

@Controller('users')
export class UsersController {
  /**
   * AUTO-DETECTION: The guard will automatically detect:
   * - Resource: 'users' (from controller name)
   * - Action: 'read' (from method name 'findAll' or HTTP GET)
   * Required permission: 'users:read'
   */
  @Get()
  @Protected()
  findAll() {
    return { message: 'Users list - auto-detected permission: users:read' };
  }

  /**
   * AUTO-DETECTION:
   * - Resource: 'users'
   * - Action: 'create' (from HTTP POST)
   * Required permission: 'users:create'
   */
  @Post()
  @Protected()
  create(@Body() userData: any) {
    return { message: 'User created - auto-detected permission: users:create' };
  }

  /**
   * AUTO-DETECTION:
   * - Resource: 'users'
   * - Action: 'update' (from HTTP PUT)
   * Required permission: 'users:update'
   */
  @Put(':id')
  @Protected()
  update(@Param('id') id: string, @Body() userData: any) {
    return {
      message: `User ${id} updated - auto-detected permission: users:update`,
    };
  }

  /**
   * AUTO-DETECTION:
   * - Resource: 'users'
   * - Action: 'delete' (from HTTP DELETE)
   * Required permission: 'users:delete'
   */
  @Delete(':id')
  @Protected()
  remove(@Param('id') id: string) {
    return {
      message: `User ${id} deleted - auto-detected permission: users:delete`,
    };
  }

  /**
   * EXPLICIT SHORTHAND: Explicitly specify the action
   * Required permission: 'users:read'
   */
  @Get('profile')
  @CanRead() // Will use controller name 'users' + action 'read'
  getProfile() {
    return { message: 'User profile - explicit permission: users:read' };
  }

  /**
   * CROSS-RESOURCE: Specify different resource
   * Required permission: 'profiles:read'
   */
  @Get('detailed-profile')
  @CanRead('profiles')
  getDetailedProfile() {
    return { message: 'Detailed profile - explicit permission: profiles:read' };
  }
}

// ===== EXAMPLE 2: PROJECTS CONTROLLER WITH MIXED APPROACHES =====

@Controller('projects')
export class ProjectsController {
  /**
   * AUTO-DETECTION: projects:read
   */
  @Get()
  @Protected()
  findAll() {
    return { message: 'Projects list' };
  }

  /**
   * EXPLICIT PERMISSIONS: Multiple permissions required
   */
  @Post()
  @RequirePermissions('projects:create', 'workspaces:read')
  create(@Body() projectData: any) {
    // User needs both project creation AND workspace reading permissions
    return { message: 'Project created with workspace validation' };
  }

  /**
   * RESOURCE + ACTION: Explicit resource and action
   */
  @Get(':id/tasks')
  @RequireResourcePermission('tasks', 'read')
  getProjectTasks(@Param('id') id: string) {
    return { message: `Tasks for project ${id}` };
  }

  /**
   * SHORTHAND: All CRUD permissions required
   */
  @Get(':id/manage')
  @CanManage('projects')
  manageProject(@Param('id') id: string) {
    // User needs: projects:create, projects:read, projects:update, projects:delete
    return { message: `Project ${id} management interface` };
  }

  /**
   * BUSINESS LOGIC: Manager-level access
   */
  @Get('reports')
  @ManagerAccess()
  getProjectReports() {
    // Requires: reports:view, settings:manage
    return { message: 'Project reports for managers' };
  }
}

// ===== EXAMPLE 3: ACCOUNTING CONTROLLER =====

@Controller('transactions')
export class TransactionsController {
  @Get()
  @FinancialAccess() // Requires: accounts:read, transactions:read, invoices:read
  findAll() {
    return { message: 'Transactions list for financial users' };
  }

  @Post()
  @RequirePermissions('transactions:create', 'accounts:read')
  create(@Body() transactionData: any) {
    return { message: 'Transaction created with account validation' };
  }

  @Get('audit')
  @RequirePermissions('transactions:read', 'audit:view')
  getAuditTrail() {
    return { message: 'Transaction audit trail' };
  }
}

// ===== EXAMPLE 4: HR CONTROLLER =====

@Controller('employees')
export class EmployeesController {
  @Get()
  @HRAccess() // Requires: employees:read, employees:update
  findAll() {
    return { message: 'Employees list for HR' };
  }

  @Post()
  @RequirePermissions('employees:create', 'users:create')
  create(@Body() employeeData: any) {
    // Creating employee might also create user account
    return { message: 'Employee created with user account' };
  }

  @Get('payroll')
  @RequirePermissions('employees:read', 'transactions:read')
  getPayroll() {
    return { message: 'Employee payroll data' };
  }
}

// ===== EXAMPLE 5: SALES CONTROLLER =====

@Controller('leads')
export class LeadsController {
  @Get()
  @SalesAccess() // Requires: leads:read, clients:read
  findAll() {
    return { message: 'Leads list for sales team' };
  }

  @Put(':id/convert')
  @RequirePermissions('leads:update', 'clients:create')
  convertToClient(@Param('id') id: string) {
    // Converting lead requires updating lead AND creating client
    return { message: `Lead ${id} converted to client` };
  }

  @Get('pipeline')
  @RequirePermissions('leads:read', 'reports:view')
  getSalesPipeline() {
    return { message: 'Sales pipeline report' };
  }
}

// ===== EXAMPLE 6: ADMIN CONTROLLER =====

@Controller('admin')
export class AdminController {
  @Get('dashboard')
  @AdminOnly() // Requires: admin:all
  getDashboard() {
    return { message: 'Admin dashboard - super admin only' };
  }

  @Get('users')
  @RequirePermissions('users:read', 'roles:read')
  getUsersWithRoles() {
    return { message: 'Users with their roles' };
  }

  @Post('system/backup')
  @AdminOnly()
  createBackup() {
    return { message: 'System backup created' };
  }
}

// ===== EXAMPLE 7: PUBLIC/AUTHENTICATED ENDPOINTS =====

@Controller('public')
export class PublicController {
  /**
   * NO AUTHENTICATION: Public endpoint
   */
  @Get('health')
  healthCheck() {
    return { message: 'System is healthy', status: 'ok' };
  }

  /**
   * AUTHENTICATED ONLY: No permission checks
   */
  @Get('profile')
  @Authenticated()
  getProfile() {
    return { message: 'User profile - any authenticated user' };
  }

  /**
   * SKIP PERMISSIONS: Explicitly skip permission checks
   */
  @Get('notifications')
  @SkipPermissions()
  getNotifications() {
    return {
      message: 'User notifications - authenticated but no permissions needed',
    };
  }
}

// ===== EXAMPLE 8: MIXED CONTROLLER WITH DIFFERENT PATTERNS =====

@Controller('files')
export class FilesController {
  /**
   * AUTO-DETECTION: files:read
   */
  @Get()
  @Protected()
  findAll() {
    return { message: 'Files list' };
  }

  /**
   * EXPLICIT PERMISSION: Single permission
   */
  @Post('upload')
  @RequirePermissions('files:create')
  upload(@Body() fileData: any) {
    return { message: 'File uploaded' };
  }

  /**
   * MULTIPLE PERMISSIONS: File + project permissions
   */
  @Post(':id/attach-to-project')
  @RequirePermissions('files:update', 'projects:update')
  attachToProject(@Param('id') id: string, @Body() data: any) {
    return { message: `File ${id} attached to project` };
  }

  /**
   * CONDITIONAL PERMISSIONS: Different permissions for different actions
   */
  @Delete(':id')
  @RequirePermissions('files:delete')
  remove(@Param('id') id: string) {
    return { message: `File ${id} deleted` };
  }

  /**
   * ADMIN OVERRIDE: Only admins can access
   */
  @Get('system')
  @AdminOnly()
  getSystemFiles() {
    return { message: 'System files - admin only' };
  }
}

// ===== EXAMPLE 9: WORKSPACE-SPECIFIC CONTROLLER =====

@Controller('workspaces')
export class WorkspacesController {
  @Get()
  @CanRead() // workspaces:read
  findAll() {
    return { message: 'Workspaces list' };
  }

  @Post()
  @CanCreate() // workspaces:create
  create(@Body() workspaceData: any) {
    return { message: 'Workspace created' };
  }

  @Get(':id/members')
  @RequirePermissions('workspaces:read', 'users:read')
  getMembers(@Param('id') id: string) {
    return { message: `Members of workspace ${id}` };
  }

  @Post(':id/invite')
  @RequirePermissions('workspaces:update', 'users:read')
  inviteUser(@Param('id') id: string, @Body() inviteData: any) {
    return { message: `User invited to workspace ${id}` };
  }
}

// ===== EXAMPLE 8: DESIGNER ROLE EXAMPLE =====

@Controller('design-tasks')
export class DesignTasksController {
  /**
   * Designer can view tasks - they have 'tasks:read' permission
   */
  @Get()
  @CanRead('tasks')
  viewTasks() {
    return { message: 'Designer can view tasks' };
  }

  /**
   * Designer can comment on tasks - they have 'comments:create' permission
   */
  @Post('comment')
  @CanCreate('comments')
  addComment(@Body() commentData: any) {
    return { message: 'Designer can add comments to tasks' };
  }

  /**
   * Designer can upload files - they have 'files:create' permission
   */
  @Post('upload')
  @CanCreate('files')
  uploadFile(@Body() fileData: any) {
    return { message: 'Designer can upload files to tasks' };
  }

  /**
   * Designer can view project context - they have 'projects:read' permission
   */
  @Get('project/:id')
  @CanRead('projects')
  viewProjectContext(@Param('id') id: string) {
    return { message: 'Designer can view project context for tasks' };
  }
}

// ===== USAGE SUMMARY =====

/*
DECORATOR PATTERNS:

1. @Protected() - Auto-detects permissions from controller/method names
2. @CanRead(), @CanCreate(), @CanUpdate(), @CanDelete() - CRUD shortcuts
3. @CanManage(resource) - All CRUD permissions for a resource
4. @RequirePermissions(...permissions) - Explicit permission list
5. @RequireResourcePermission(resource, action) - Explicit resource:action
6. @AdminOnly(), @ManagerAccess(), etc. - Business-specific shortcuts
7. @Authenticated() - Just authentication, no permissions
8. @SkipPermissions() - Skip permission checks for authenticated users

AUTO-DETECTION RULES:
- Controller name (minus 'Controller') becomes resource
- Method names like 'findAll', 'create', 'update', 'remove' map to actions
- HTTP methods (GET, POST, PUT, DELETE) map to actions as fallback

PERMISSION FORMAT:
- Always: resource:action (e.g., 'users:create', 'projects:read')
- Special permissions: 'admin:all', 'reports:view', 'settings:manage'

MULTIPLE PERMISSIONS:
- User must have ALL specified permissions
- Use @RequirePermissions('perm1', 'perm2', 'perm3')

FLEXIBILITY:
- Mix and match any approach in the same controller
- Override auto-detection with explicit permissions when needed
- Create custom business-specific decorators
*/
