import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  taggedUserIds?: string[];
}
