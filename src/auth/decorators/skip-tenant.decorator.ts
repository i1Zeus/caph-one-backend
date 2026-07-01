import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_KEY = 'skip_tenant_check';
export const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_KEY, true);
