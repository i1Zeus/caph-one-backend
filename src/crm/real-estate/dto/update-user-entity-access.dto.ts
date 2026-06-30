import { EntityType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional } from 'class-validator';

export class UpdateUserEntityAccessDto {
  @IsOptional()
  @IsArray()
  @IsEnum(EntityType, { each: true })
  entityTypes?: EntityType[];
}
