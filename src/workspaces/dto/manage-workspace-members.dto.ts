import { WorkspaceRole } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum, IsUUID } from 'class-validator';

export class AddWorkspaceMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}

export class AddWorkspaceMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  members: AddWorkspaceMemberDto[];
}

export class RemoveWorkspaceMemberDto {
  @IsUUID()
  userId: string;
}

export class RemoveWorkspaceMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  userIds: string[];
}

export class UpdateMemberRoleDto {
  @IsUUID()
  userId: string;

  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
