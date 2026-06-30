import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class AddContributorsDto {
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  userIds: string[];
}

export class RemoveContributorsDto {
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  userIds: string[];
}
