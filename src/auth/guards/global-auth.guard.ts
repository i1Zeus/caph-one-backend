import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_SKIP_KEY } from '../decorators/universal-auth.decorator';
import { UniversalAuthGuard } from './universal-auth.guard';

@Injectable()
export class GlobalAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private universalAuthGuard: UniversalAuthGuard,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if auth should be skipped (public endpoints)
    const skipAuth = this.reflector.getAllAndOverride<boolean>(AUTH_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) {
      return true;
    }

    // First, authenticate the user (JWT validation)
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // Then, check permissions using the universal auth guard
    return this.universalAuthGuard.canActivate(context);
  }
}
