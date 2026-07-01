import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from './prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  private _client: any;

  constructor(
    private prisma: PrismaService,
    @Inject(REQUEST) private request: any,
  ) {
    const user = this.request?.user;
    this._client = this.prisma.forTenant(
      user?.tenantId || null,
      user?.isSuperAdmin === true,
    );
  }

  get client(): any {
    return this._client;
  }
}
