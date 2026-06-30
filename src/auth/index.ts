// ===== UNIVERSAL DYNAMIC AUTH SYSTEM =====

// Universal Auth Decorators (RECOMMENDED)
export { Auth, AuthOnly, Public } from './decorators/universal-auth.decorator';

// Universal Guards
export { GlobalAuthGuard } from './guards/global-auth.guard';
export { UniversalAuthGuard } from './guards/universal-auth.guard';

// Advanced Decorators (for specific use cases)
export {
  AdminOnly,
  Authenticated,
  CanCreate,
  CanDelete,
  CanManage,
  CanRead,
  CanUpdate,
  FinancialAccess,
  HRAccess,
  ManagerAccess,
  Protected,
  RequirePermissions,
  RequireResourcePermission,
  SalesAccess,
  SkipPermissions,
} from './decorators/dynamic-auth.decorator';

// Advanced Guards
export { DynamicPermissionsGuard } from './guards/dynamic-permissions.guard';

// Services
export { DynamicPermissionsService } from './services/dynamic-permissions.service';

// Controllers
export { PermissionsController } from './controllers/permissions.controller';
export { RolesController } from './controllers/roles.controller';

// Types
export type {
  AssignPermissionsDto,
  AssignRoleToUserDto,
  CreateRoleDto,
} from './services/dynamic-permissions.service';
