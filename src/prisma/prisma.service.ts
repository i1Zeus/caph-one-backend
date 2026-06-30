import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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
}
