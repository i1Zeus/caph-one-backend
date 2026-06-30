import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class TranscribeAndCreateTaskDto {
  // Audio transcription parameters
  @IsString()
  @IsOptional()
  language?: string; // Optional language hint for better transcription

  @IsString()
  @IsOptional()
  prompt?: string; // Optional context prompt to improve transcription accuracy

  // Task creation parameters
  @IsUUID()
  @IsNotEmpty()
  projectId: string; // Required project ID for the task

  @IsString()
  @IsOptional()
  additionalContext?: string; // Optional context to improve task creation

  @IsUUID()
  @IsOptional()
  taskStageId?: string; // Optional task stage ID

  @IsUUID()
  @IsOptional()
  parentId?: string; // Optional parent task ID for subtasks
}
