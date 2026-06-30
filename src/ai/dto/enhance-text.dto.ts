import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class EnhanceTextDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsIn(['enhance', 'professionalize', 'shorten', 'expand'])
  operation: 'enhance' | 'professionalize' | 'shorten' | 'expand';
}
