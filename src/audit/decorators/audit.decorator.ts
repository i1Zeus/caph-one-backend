import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit';

export interface AuditOptions {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | string;
  entity: string;
  idField?: string; // Field name that contains the entity ID (default: 'id')
  extractId?: (args: any[], result: any) => string; // Custom function to extract entity ID
  skipAudit?: boolean; // Skip audit for this operation
}

/**
 * Decorator to mark methods for audit logging
 *
 * @example
 * @Audit({ action: 'CREATE', entity: 'USER' })
 * async create(createUserDto: CreateUserDto) { ... }
 *
 * @example
 * @Audit({ action: 'UPDATE', entity: 'TASK', idField: 'taskId' })
 * async updateTask(taskId: string, updateData: any) { ... }
 *
 * @example
 * @Audit({
 *   action: 'DELETE',
 *   entity: 'PROJECT',
 *   extractId: (args, result) => args[0] // First argument is the ID
 * })
 * async remove(id: string) { ... }
 */
export const Audit = (options: AuditOptions) =>
  SetMetadata(AUDIT_METADATA_KEY, options);

/**
 * Skip audit logging for this method
 */
export const SkipAudit = () =>
  SetMetadata(AUDIT_METADATA_KEY, { skipAudit: true });
