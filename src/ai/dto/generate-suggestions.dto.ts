import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateSuggestionsDto {
  @IsString()
  @IsNotEmpty()
  context: string;
}
