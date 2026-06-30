import { IsOptional, IsString } from 'class-validator';

export class TranscribeAudioDto {
  @IsString()
  @IsOptional()
  language?: string; // Optional language hint for better transcription

  @IsString()
  @IsOptional()
  prompt?: string; // Optional context prompt to improve transcription accuracy
}
