import {
  Body,
  Controller,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AiService } from './ai.service';
import { EnhanceTextDto } from './dto/enhance-text.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { GenerateSuggestionsDto } from './dto/generate-suggestions.dto';
import { TextToTaskDto } from './dto/text-to-task.dto';
import { TranscribeAndCreateTaskDto } from './dto/transcribe-and-create-task.dto';
import { TranscribeAudioDto } from './dto/transcribe-audio.dto';

// Multer configuration for audio file uploads
const multerConfig = {
  storage: diskStorage({
    destination: './uploads/audio',
    filename: (req, file, cb) => {
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      cb(null, `${randomName}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/mp4',
      'audio/webm',
      'audio/ogg',
      'audio/flac',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file format'), false);
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
};

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-description')
  async generateDescription(
    @Body() generateDescriptionDto: GenerateDescriptionDto,
  ) {
    try {
      const description = await this.aiService.generateTaskDescription(
        generateDescriptionDto.title,
        generateDescriptionDto.additionalContext,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Description generated successfully',
        data: { description },
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('enhance-text')
  async enhanceText(@Body() enhanceTextDto: EnhanceTextDto) {
    try {
      const enhancedText = await this.aiService.enhanceText(
        enhanceTextDto.text,
        enhanceTextDto.operation,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Text enhanced successfully',
        data: { enhancedText },
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('generate-suggestions')
  async generateSuggestions(
    @Body() generateSuggestionsDto: GenerateSuggestionsDto,
  ) {
    try {
      const suggestions = await this.aiService.generateSuggestions(
        generateSuggestionsDto.context,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Suggestions generated successfully',
        data: { suggestions },
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('transcribe-audio')
  @UseInterceptors(FileInterceptor('audio', multerConfig))
  async transcribeAudio(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() transcribeAudioDto: TranscribeAudioDto,
  ) {
    try {
      const transcription = await this.aiService.transcribeAudio(
        audioFile,
        transcribeAudioDto.language,
        transcribeAudioDto.prompt,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Audio transcribed successfully',
        data: { transcription },
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('text-to-task')
  async textToTask(@Body() textToTaskDto: TextToTaskDto) {
    try {
      const task = await this.aiService.convertTextToTask(
        textToTaskDto.text,
        textToTaskDto.projectId,
        textToTaskDto.additionalContext,
        textToTaskDto.taskStageId,
        textToTaskDto.parentId,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Text converted to task successfully',
        data: { task },
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('transcribe-and-create-task')
  @UseInterceptors(FileInterceptor('audio', multerConfig))
  async transcribeAndCreateTask(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() transcribeAndCreateTaskDto: TranscribeAndCreateTaskDto,
  ) {
    try {
      const result = await this.aiService.transcribeAndCreateTask(
        audioFile,
        transcribeAndCreateTaskDto.projectId,
        transcribeAndCreateTaskDto.language,
        transcribeAndCreateTaskDto.prompt,
        transcribeAndCreateTaskDto.additionalContext,
        transcribeAndCreateTaskDto.taskStageId,
        transcribeAndCreateTaskDto.parentId,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Audio transcribed and task created successfully',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }
}
