import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from 'utils/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub, // Map sub to userId for consistency
      email: payload.email,
      roles: payload.roles || [], // Extract roles array from JWT payload
      permissions: payload.permissions || [], // Extract permissions array
      name: payload.name,
      phone: payload.phone,
      tenantId: payload.tenantId, // Scoped organization ID
      isSuperAdmin: payload.isSuperAdmin === true, // SuperAdmin flag
      role: payload.role, // User's system-wide role
      id: payload.sub, // Also provide id for backward compatibility
    };
  }
}
