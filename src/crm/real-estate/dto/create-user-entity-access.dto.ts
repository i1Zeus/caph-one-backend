import { EntityType } from '@prisma/client';
import { IsArray, IsEnum, IsString } from 'class-validator';

export class CreateUserEntityAccessDto {
  @IsString()
  userId: string;

  @IsArray()
  @IsEnum(EntityType, { each: true })
  entityTypes: EntityType[]; // Array of entity types user should have access to
}
