import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { Auth, AuthOnly, Public } from './decorators/universal-auth.decorator';
import { DynamicPermissionsService } from './services/dynamic-permissions.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly permissionsService: DynamicPermissionsService,
  ) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @Public() // Public endpoint - no auth needed
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Get('profile')
  @AuthOnly() // Just authentication, no permission checks
  getProfile(@Request() req) {
    return req.user;
  }
  // admin seed
  @Post('admin-seed')
  @Public() // Public for initial setup
  async adminSeed() {
    try {
      // Find or create default organization
      let defaultOrg = await this.prisma.organization.findFirst({
        where: { slug: 'default' },
      });
      if (!defaultOrg) {
        defaultOrg = await this.prisma.organization.create({
          data: {
            name: 'Default Organization',
            slug: 'default',
            subdomain: 'default',
            maxWorkspaces: 5,
            subscriptionTier: 'FREE',
            maxUsers: 10,
          },
        });
      }

      // Create admin user
      const adminUser = await this.prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@admin.com',
          password: bcrypt.hashSync('admin', 10),
          phone: '9647736000954',
          organizationId: defaultOrg.id,
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
        },
      });

      // Seed permissions and roles
      await this.permissionsService.seedDefaultPermissions();
      await this.permissionsService.seedDefaultRoles();

      // Find Super Admin role
      const superAdminRole = await this.prisma.role.findUnique({
        where: { name: 'Super Admin' },
      });

      if (superAdminRole) {
        // Assign Super Admin role to the admin user
        await this.permissionsService.assignRolesToUser(adminUser.id, [
          superAdminRole.id,
        ]);
      }

      return {
        message: 'Admin seed successful',
        user: {
          name: 'Admin',
          email: 'admin@admin.com',
          phone: '9647736000954',
          roles: ['Super Admin'],
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  // signup
  @Post('signup')
  @Public() // Public endpoint
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto);
  }

  // permissions seed
  @Post('permissions-seed')
  @Public() // Public for initial setup
  async permissionsSeed() {
    try {
      await this.permissionsService.seedDefaultPermissions();
      await this.permissionsService.seedDefaultRoles();
      return { message: 'Permissions and roles seeded successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ===== EXAMPLE ENDPOINTS DEMONSTRATING UNIVERSAL AUTH =====

  /**
   * Example 1: Auto-detection
   * Controller: AuthController -> resource: "auth"
   * Method: getUsers() -> action: "read"
   * Required permission: "auth:read"
   */
  @Get('users')
  @Auth() // Will auto-detect: auth:read
  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    return { success: true, data: users };
  }

  /**
   * Example 2: Explicit action override
   * Resource: "auth" (from controller)
   * Action: "create" (explicitly specified)
   * Required permission: "auth:create"
   */
  @Post('test-create')
  @Auth('create') // Explicit action: auth:create
  async testCreate(@Body() data: any) {
    return {
      success: true,
      message: 'Create action with auth:create permission',
      data,
    };
  }

  /**
   * Example 3: Both resource and action override
   * Resource: "users" (explicitly specified)
   * Action: "update" (explicitly specified)
   * Required permission: "users:update"
   */
  @Post('update-user/:id')
  @Auth('update', 'users') // Explicit: users:update
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return {
      success: true,
      message: `User ${id} updated with users:update permission`,
      data,
    };
  }

  /**
   * Example 4: Auto-detection with different method names
   * These will all auto-detect to different actions:
   */

  @Get('find-something')
  @Auth() // Auto-detects: auth:read (because method starts with 'find')
  async findSomething() {
    return { action: 'read', permission: 'auth:read' };
  }

  @Post('create-something')
  @Auth() // Auto-detects: auth:create (because method starts with 'create')
  async createSomething() {
    return { action: 'create', permission: 'auth:create' };
  }

  @Post('update-something')
  @Auth() // Auto-detects: auth:update (because method starts with 'update')
  async updateSomething() {
    return { action: 'update', permission: 'auth:update' };
  }

  @Post('delete-something')
  @Auth() // Auto-detects: auth:delete (because method starts with 'delete')
  async deleteSomething() {
    return { action: 'delete', permission: 'auth:delete' };
  }

  /**
   * Example 5: HTTP method fallback
   * When method name doesn't match patterns, uses HTTP method
   */
  @Get('some-random-name')
  @Auth() // Auto-detects: auth:read (GET -> read)
  async someRandomName() {
    return {
      action: 'read',
      permission: 'auth:read',
      note: 'Detected from HTTP GET method',
    };
  }

  @Post('another-random-name')
  @Auth() // Auto-detects: auth:create (POST -> create)
  async anotherRandomName() {
    return {
      action: 'create',
      permission: 'auth:create',
      note: 'Detected from HTTP POST method',
    };
  }

  /**
   * Example 6: Check user permissions
   */
  @Get('my-permissions')
  @AuthOnly() // Just authentication, no permission check
  async getMyPermissions(@Request() req) {
    const userId = req.user.userId;
    const permissions =
      await this.permissionsService.getUserPermissions(userId);
    const roles = await this.permissionsService.getUserRoles(userId);

    return {
      success: true,
      data: {
        userId,
        permissions,
        roles: roles.map((ur) => ur.role),
      },
    };
  }

  /**
   * Example 7: Test specific permission
   */
  @Post('test-permission')
  @AuthOnly()
  async testPermission(
    @Body() { resource, action }: { resource: string; action: string },
    @Request() req,
  ) {
    const userId = req.user.userId;
    const hasPermission =
      await this.permissionsService.userHasResourcePermission(
        userId,
        resource,
        action,
      );

    return {
      success: true,
      data: {
        userId,
        resource,
        action,
        hasPermission,
        requiredPermission: `${resource}:${action}`,
      },
    };
  }
}
