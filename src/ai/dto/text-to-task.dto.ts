import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class TextToTaskDto {
  @IsString()
  @IsNotEmpty()
  text: string; // The transcribed text or any text input

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
