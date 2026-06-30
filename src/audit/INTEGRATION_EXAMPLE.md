# Audit System Integration Example

This example shows how to integrate the audit system with your existing `UsersService` to automatically track all user-related activities.

## Step 1: Import Audit Decorators

```typescript
// users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, Audit, SkipAudit } from '../audit'; // Import audit decorators
import { UserRole } from '@prisma/client';
// ... other imports
```

## Step 2: Add Audit Decorators to Service Methods

```typescript
@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private auditService: AuditService, // Inject AuditService for manual logging
  ) {}

  // CREATE: Automatically log user creation
  @Audit({ action: 'CREATE', entity: 'USER' })
  async create(createUserDto: CreateUserDto) {
    // Check if user with email already exists
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    // ... rest of create logic
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        phone: cleanPhoneNumber(createUserDto.phone),
        role: createUserDto.role || UserRole.EMPLOYEE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        role: true,
        type: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // The @Audit decorator will automatically log this creation
    return user;
  }

  // READ: Skip audit for read operations (they're not sensitive)
  @SkipAudit()
  async findAll(params: FindAllUsersParams): Promise<PaginatedUsersResponse> {
    // ... existing findAll logic
  }

  @SkipAudit()
  async findOne(id: string) {
    // ... existing findOne logic
  }

  @SkipAudit()
  async findByEmail(email: string) {
    // ... existing findByEmail logic
  }

  // UPDATE: Log user updates with custom ID extraction
  @Audit({
    action: 'UPDATE',
    entity: 'USER',
    extractId: (args) => args[0], // First argument is the user ID
  })
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // ... validation logic

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        role: true,
        type: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // The @Audit decorator will automatically log this update
    return updatedUser;
  }

  // DELETE: Log user deletion (soft delete)
  @Audit({
    action: 'DELETE',
    entity: 'USER',
    extractId: (args) => args[0], // First argument is the user ID
  })
  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Soft delete by setting isDeleted to true
    const deletedUser = await this.prisma.user.update({
      where: { id },
      data: { isDeleted: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        role: true,
        type: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // The @Audit decorator will automatically log this deletion
    return deletedUser;
  }

  // CUSTOM ACTIONS: Manual audit logging for complex operations
  async changeUserRole(userId: string, newRole: UserRole, changedBy: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const oldRole = user.role;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // Manual audit logging for role changes
    await this.auditService.logCustomAction(
      'ROLE_CHANGE',
      'USER',
      userId,
      {
        oldRole,
        newRole,
        userName: user.name,
        changedAt: new Date(),
      },
      changedBy,
    );

    return updatedUser;
  }

  async resetPassword(userId: string, newPassword: string, resetBy: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Manual audit logging for password resets
    await this.auditService.logCustomAction(
      'PASSWORD_RESET',
      'USER',
      userId,
      {
        resetAt: new Date(),
        resetType: 'admin_reset',
      },
      resetBy,
    );

    return { message: 'Password reset successfully' };
  }

  async bulkDeleteUsers(userIds: string[], deletedBy: string) {
    // Log bulk operation before execution
    await this.auditService.logCustomAction(
      'BULK_DELETE',
      'USER',
      'bulk_operation',
      {
        userIds,
        count: userIds.length,
        deletedBy,
      },
      deletedBy,
    );

    const result = await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isDeleted: true },
    });

    return result;
  }

  async importUsersFromCSV(csvData: any[], importedBy: string) {
    const importId = `import_${Date.now()}`;

    try {
      // Log import start
      await this.auditService.logCustomAction(
        'IMPORT_START',
        'USER',
        importId,
        {
          recordCount: csvData.length,
          source: 'CSV',
        },
        importedBy,
      );

      const results = [];
      for (const userData of csvData) {
        try {
          const user = await this.create(userData);
          results.push(user);
        } catch (error) {
          console.error(`Failed to create user: ${userData.email}`, error);
        }
      }

      // Log import success
      await this.auditService.logCustomAction(
        'IMPORT_SUCCESS',
        'USER',
        importId,
        {
          successCount: results.length,
          failureCount: csvData.length - results.length,
          createdUserIds: results.map((u) => u.id),
        },
        importedBy,
      );

      return results;
    } catch (error) {
      // Log import failure
      await this.auditService.logCustomAction(
        'IMPORT_FAILED',
        'USER',
        importId,
        {
          error: error.message,
          recordCount: csvData.length,
        },
        importedBy,
      );

      throw error;
    }
  }

  // Audit query methods
  async getUserActivityHistory(userId: string) {
    return this.auditService.getEntityHistory('USER', userId, 100);
  }
}
```

## Step 3: Update Controller to Pass User Context

```typescript
// users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Auth(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    // The @Audit decorator will automatically capture the user context from the request
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // Custom endpoints for audit-logged operations
  @Patch(':id/role')
  @Auth(UserRole.SUPER_ADMIN)
  changeRole(
    @Param('id') id: string,
    @Body() { role }: { role: UserRole },
    @Request() req: any,
  ) {
    const changedBy = req.user.userId;
    return this.usersService.changeUserRole(id, role, changedBy);
  }

  @Post(':id/reset-password')
  @Auth(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  resetPassword(
    @Param('id') id: string,
    @Body() { password }: { password: string },
    @Request() req: any,
  ) {
    const resetBy = req.user.userId;
    return this.usersService.resetPassword(id, password, resetBy);
  }

  @Get(':id/audit-history')
  @Auth(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAuditHistory(@Param('id') id: string) {
    return this.usersService.getUserActivityHistory(id);
  }
}
```

## Step 4: Testing the Audit System

```bash
# Create a user - will be logged as CREATE action
POST /users
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "role": "EMPLOYEE"
}

# Update a user - will be logged as UPDATE action
PATCH /users/123abc
{
  "name": "John Smith"
}

# Delete a user - will be logged as DELETE action
DELETE /users/123abc

# Change user role - will be logged as ROLE_CHANGE action
PATCH /users/123abc/role
{
  "role": "MANAGER"
}

# Reset password - will be logged as PASSWORD_RESET action
POST /users/123abc/reset-password
{
  "password": "newpassword123"
}

# View user's audit history
GET /users/123abc/audit-history
```

## Step 5: Viewing Audit Logs

```bash
# Get recent system activity
GET /audit/history?limit=50

# Get specific user's activity
GET /audit/entity/USER/123abc?limit=20

# Get audit statistics
GET /audit/statistics?days=7
```

## What Gets Logged

### Automatic Logging (via decorators):

- **CREATE**: User creation with sanitized user data
- **UPDATE**: User updates with change details
- **DELETE**: User deletions with deleted user info

### Manual Logging (via AuditService):

- **ROLE_CHANGE**: Role changes with old/new roles
- **PASSWORD_RESET**: Password resets with metadata
- **BULK_DELETE**: Bulk user deletions
- **IMPORT_START/SUCCESS/FAILED**: CSV import operations

### Database-Level Logging (via Prisma middleware):

- All database operations are automatically logged
- Includes operation timing and metadata
- Catches any operations missed by service decorators

## Sample Audit Log Entry

```json
{
  "id": "audit-123",
  "actionType": "UPDATE",
  "entityType": "USER",
  "entityId": "user-123abc",
  "details": {
    "changes": {
      "name": {
        "from": "John Doe",
        "to": "John Smith"
      }
    },
    "oldData": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "EMPLOYEE"
    },
    "newData": {
      "name": "John Smith",
      "email": "john@example.com",
      "role": "EMPLOYEE"
    }
  },
  "performedBy": "admin-user-id",
  "createdAt": "2024-01-15T10:30:00Z",
  "user": {
    "id": "admin-user-id",
    "name": "Admin User",
    "email": "admin@example.com"
  }
}
```

## Benefits of This Integration

1. **Complete Audit Trail**: Every user operation is tracked
2. **Automatic Logging**: No need to manually add audit code everywhere
3. **Security**: Sensitive data is automatically sanitized
4. **Performance**: Asynchronous logging doesn't slow down operations
5. **Flexibility**: Can skip audit for read operations or add custom audit logic
6. **Compliance**: Provides audit trail for compliance requirements

This integration provides comprehensive audit logging for your user management system while maintaining clean, readable code.
