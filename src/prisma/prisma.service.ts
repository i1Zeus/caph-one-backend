import {
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Configure query timeout and logging
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'stdout',
          level: 'error',
        },
        {
          emit: 'stdout',
          level: 'info',
        },
        {
          emit: 'stdout',
          level: 'warn',
        },
      ],
    });
  }
  async onModuleInit() {
    await this.$connect();

    // Add audit middleware (excluded since interceptor handles it)
    // this.$use(createPrismaAuditMiddleware({
    //     excludeModels: [], // All models handled by interceptor now
    //     skipActionHistory: true, // Prevent recursion
    // }));
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }

  forTenant(tenantId: string | null, isSuperAdmin: boolean): any {
    if (isSuperAdmin || !tenantId) {
      return this;
    }

    const modelsWithOrg = new Set([
      'Workspace',
      'User',
      'Client',
      'Currency',
      'Account',
      'Transaction',
      'AccountingSettings',
      'InvoiceAccountingConfig',
      'Department',
      'Employee',
      'Job',
      'Product',
      'ProductCategory',
      'UnitCategory',
      'Unit',
      'Warehouse',
      'WarehouseTransaction',
      'SalesInvoice',
      'PurchaseInvoice',
      'PurchaseReturnInvoice',
      'SalesReturnInvoice',
      'POS',
      'InvoiceTemplate',
      'Sale',
      'Lead',
      'LeadStage',
      'ActionHistory',
      'LoginEvent',
    ]);

    return this.$extends({
      query: {
        $allModels: {
          findMany: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              (args as any).where = {
                ...(args as any).where,
                organizationId: tenantId,
              };
            }
            return query(args);
          },
          findFirst: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              (args as any).where = {
                ...(args as any).where,
                organizationId: tenantId,
              };
            }
            return query(args);
          },
          findUnique: async ({ model, args, query }) => {
            const result = await query(args);
            if (
              result &&
              modelsWithOrg.has(model) &&
              (result as any).organizationId !== tenantId
            ) {
              return null;
            }
            return result;
          },
          create: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              (args as any).data = {
                ...(args as any).data,
                organizationId: tenantId,
              };
            }
            return query(args);
          },
          update: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              const dbName = model.charAt(0).toLowerCase() + model.slice(1);
              const db = (this as any)[dbName];
              if (db) {
                const count = await db.count({
                  where: { ...(args as any).where, organizationId: tenantId },
                });
                if (count === 0) {
                  throw new ForbiddenException(
                    'Record not found or access denied.',
                  );
                }
              }
            }
            return query(args);
          },
          updateMany: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              (args as any).where = {
                ...(args as any).where,
                organizationId: tenantId,
              };
            }
            return query(args);
          },
          delete: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              const dbName = model.charAt(0).toLowerCase() + model.slice(1);
              const db = (this as any)[dbName];
              if (db) {
                const count = await db.count({
                  where: { ...(args as any).where, organizationId: tenantId },
                });
                if (count === 0) {
                  throw new ForbiddenException(
                    'Record not found or access denied.',
                  );
                }
              }
            }
            return query(args);
          },
          deleteMany: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              (args as any).where = {
                ...(args as any).where,
                organizationId: tenantId,
              };
            }
            return query(args);
          },
          count: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              (args as any).where = {
                ...(args as any).where,
                organizationId: tenantId,
              };
            }
            return query(args);
          },
          aggregate: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              (args as any).where = {
                ...(args as any).where,
                organizationId: tenantId,
              };
            }
            return query(args);
          },
          groupBy: async ({ model, args, query }) => {
            if (modelsWithOrg.has(model)) {
              (args as any).where = {
                ...(args as any).where,
                organizationId: tenantId,
              };
            }
            return query(args);
          },
        },
      },
    }) as any;
  }
}
