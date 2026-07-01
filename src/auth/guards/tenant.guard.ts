import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { SKIP_TENANT_KEY } from '../decorators/skip-tenant.decorator';
import { AUTH_SKIP_KEY } from '../decorators/universal-auth.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if auth or tenant checks are skipped
    const skipTenant = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );
    const skipAuth = this.reflector.getAllAndOverride<boolean>(AUTH_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTenant || skipAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If route is protected but no user authenticated, return false (handled by AuthGuard)
    if (!user) {
      return true;
    }

    // 2. SuperAdmin bypass
    if (user.isSuperAdmin) {
      return true;
    }

    // 3. Regular users must have a tenantId and active organization
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Access denied. No organization assigned.');
    }

    // Fetch and validate organization status
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
    });

    if (!organization || organization.isDeleted) {
      throw new ForbiddenException('Access denied. Organization not found.');
    }

    if (!organization.isActive) {
      throw new ForbiddenException(
        'Access denied. Organization is deactivated.',
      );
    }

    // Store organization on request for down-stream access if needed
    request.organization = organization;

    return true;
  }
}
