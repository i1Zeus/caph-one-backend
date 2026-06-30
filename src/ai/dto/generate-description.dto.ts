import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateDescriptionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  additionalContext?: string;
}
