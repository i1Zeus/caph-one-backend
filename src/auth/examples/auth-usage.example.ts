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
  CanCreate,
  CanRead,
  RequirePermissions,
} from '../decorators/dynamic-auth.decorator';
import { Auth, AuthOnly, Public } from '../decorators/universal-auth.decorator';

/**
 * 🎉 NEW DYNAMIC AUTH SYSTEM EXAMPLES
 *
 * This shows how to use the new completely dynamic role-permission system.
 * No more hardcoded roles! Everything is database-driven and flexible.
 */

// ===== UNIVERSAL @Auth() EXAMPLES (New Approach) =====

/**
 * 🎯 AUTO-DETECTION CONTROLLER: The system automatically detects permissions!
 */
@Controller('example')
@Auth() // 🔥 Controller-level protection! All endpoints require authentication + permissions
export class ExampleController {
  /**
   * 🎯 AUTO-DETECTION: The system automatically detects permissions!
   * Controller: 'example' → Resource: 'example'
   * Method: GET findAll() → Action: 'read'
   * Required Permission: 'example:read'
   */
  @Get()
  findAll() {
    // Auto-detects: example:read
    return { message: 'Example list accessed via auto-detection' };
  }

  @Post()
  create(@Body() data: any) {
    // Auto-detects: example:create (POST method)
    return { message: 'Example created via auto-detection' };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    // Auto-detects: example:update (PUT method)
    return { message: `Example ${id} updated via auto-detection` };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // Auto-detects: example:delete (DELETE method)
    return { message: `Example ${id} deleted via auto-detection` };
  }

  // ===== EXPLICIT PERMISSION OVERRIDES =====

  /**
   * 🎯 EXPLICIT OVERRIDES: When auto-detection isn't enough
   */
  @Get('users')
  @Auth('read', 'users') // Explicit: users:read
  getUsersEndpoint() {
    // Explicitly requires 'users:read' permission
    return { message: 'Users list accessed via explicit permission' };
  }

  @Post('users/bulk-import')
  @Auth('create', 'users') // Override: bulk import = create users
  bulkImportUsers(@Body() userData: any[]) {
    // Even though it's POST, we explicitly specify it needs users:create
    return { message: 'Users bulk imported' };
  }

  @Post('users/:id/activate')
  @Auth('update', 'users') // Override: activating = updating users
  activateUser(@Param('id') id: string) {
    // Business logic: activating a user is considered updating
    return { message: `User ${id} activated` };
  }

  @Delete('users/:id/archive')
  @Auth('update', 'users') // Override: archiving ≠ deleting
  archiveUser(@Param('id') id: string) {
    // Business logic: archiving is updating, not deleting
    return { message: `User ${id} archived` };
  }

  // ===== ADVANCED PERMISSION PATTERNS =====

  /**
   * 🎯 MULTIPLE PERMISSIONS: Using the advanced decorators
   */
  @Get('admin-reports')
  @RequirePermissions('reports:view', 'audit:view')
  adminReportsEndpoint() {
    // User must have BOTH 'reports:view' AND 'audit:view' permissions
    return { message: 'Admin reports accessed' };
  }

  @Get('projects/manage')
  @RequirePermissions(
    'projects:create',
    'projects:read',
    'projects:update',
    'projects:delete',
  )
  manageProjectsEndpoint() {
    // User must have ALL project permissions
    return { message: 'Project management interface accessed' };
  }

  /**
   * 🎯 USING SPECIFIC CRUD DECORATORS
   */
  @Post('advanced-create')
  @CanCreate('projects')
  advancedCreate(@Body() data: any) {
    // Explicitly requires projects:create
    return { message: 'Advanced project created' };
  }

  @Get('advanced-read')
  @CanRead('projects')
  advancedRead() {
    // Explicitly requires projects:read
    return { message: 'Advanced project data accessed' };
  }

  // ===== PUBLIC AND AUTH-ONLY ENDPOINTS =====

  /**
   * 🌍 PUBLIC ENDPOINTS: Override controller-level @Auth()
   */
  @Get('public-info')
  @Public() // Override: make this endpoint public
  getPublicInfo() {
    // Anyone can access this, no authentication required
    return { message: 'Public information accessed' };
  }

  @Get('health')
  @Public() // Override: health check should be public
  healthCheck() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }

  /**
   * 🔐 AUTH-ONLY ENDPOINTS: Authentication but no specific permissions
   */
  @Get('profile')
  @AuthOnly() // Override: just need to be authenticated
  getProfileEndpoint() {
    // Any authenticated user can access this
    return { message: 'User profile accessed' };
  }

  @Get('dashboard')
  @AuthOnly() // Override: basic dashboard access
  getDashboard() {
    // Any authenticated user can see basic dashboard
    return { message: 'Dashboard accessed' };
  }
}

// ===== REAL-WORLD CONTROLLER EXAMPLES =====

/**
 * 🎯 ACCOUNTING CONTROLLER: Complete CRUD with auto-detection
 */
@Controller('transactions')
@Auth() // All endpoints require transactions:* permissions
export class TransactionsController {
  @Get() // Auto-detects: transactions:read
  findAll() {
    return { message: 'Transactions list accessed' };
  }

  @Post() // Auto-detects: transactions:create
  create(@Body() data: any) {
    return { message: 'Transaction created' };
  }

  @Put(':id') // Auto-detects: transactions:update
  update(@Param('id') id: string, @Body() data: any) {
    return { message: `Transaction ${id} updated` };
  }

  @Delete(':id') // Auto-detects: transactions:delete
  remove(@Param('id') id: string) {
    return { message: `Transaction ${id} deleted` };
  }

  @Post(':id/approve')
  @Auth('update') // Override: approving = updating
  approve(@Param('id') id: string) {
    return { message: `Transaction ${id} approved` };
  }

  @Get('reports')
  @Auth('read') // Explicit: reading reports = reading transactions
  getReports() {
    return { message: 'Transaction reports accessed' };
  }
}

/**
 * 🎯 MIXED ACCESS CONTROLLER: Public + Protected endpoints
 */
@Controller('products')
// No controller-level @Auth() - handle per endpoint
export class ProductsController {
  @Get()
  @Public() // Anyone can view products
  findAll() {
    return { message: 'Public product catalog' };
  }

  @Get(':id')
  @Public() // Anyone can view product details
  findOne(@Param('id') id: string) {
    return { message: `Product ${id} details` };
  }

  @Post()
  @Auth() // Auto-detects: products:create
  create(@Body() data: any) {
    return { message: 'Product created (requires products:create)' };
  }

  @Put(':id')
  @Auth() // Auto-detects: products:update
  update(@Param('id') id: string, @Body() data: any) {
    return { message: `Product ${id} updated (requires products:update)` };
  }

  @Get('analytics')
  @RequirePermissions('products:read', 'reports:view')
  getAnalytics() {
    // Requires both products:read AND reports:view
    return { message: 'Product analytics accessed' };
  }
}

/**
 * 🎯 HR CONTROLLER: Department-specific permissions
 */
@Controller('employees')
@Auth() // All endpoints require employees:* permissions
export class EmployeesController {
  @Get() // Auto-detects: employees:read
  findAll() {
    return { message: 'Employees list accessed' };
  }

  @Post() // Auto-detects: employees:create
  create(@Body() data: any) {
    return { message: 'Employee created' };
  }

  @Get(':id/salary')
  @RequirePermissions('employees:read', 'salaries:read')
  getSalary(@Param('id') id: string) {
    // Requires both employee and salary permissions
    return { message: `Employee ${id} salary accessed` };
  }

  @Post('bulk-import')
  @Auth('create') // Override: bulk import = create
  bulkImport(@Body() data: any[]) {
    return { message: 'Employees bulk imported' };
  }
}

/**
 * 🎯 SETTINGS CONTROLLER: Admin-only operations
 */
@Controller('settings')
export class SettingsController {
  @Get()
  @RequirePermissions('settings:read')
  findAll() {
    return { message: 'Settings accessed' };
  }

  @Put()
  @RequirePermissions('settings:manage')
  update(@Body() data: any) {
    return { message: 'Settings updated' };
  }

  @Post('backup')
  @RequirePermissions('admin:all') // Only super admins
  createBackup() {
    return { message: 'System backup created' };
  }
}

/**
 * 🎉 BENEFITS OF THE NEW SYSTEM:
 *
 * ✅ No hardcoded roles - completely dynamic
 * ✅ Auto-detection reduces boilerplate code
 * ✅ Controller-level protection with easy overrides
 * ✅ Granular permissions (resource:action format)
 * ✅ Flexible role names ("Project Manager", "HR Lead", etc.)
 * ✅ Easy to understand and maintain
 * ✅ Backward compatible with existing decorators
 * ✅ Database-driven - no code changes for new roles
 */
