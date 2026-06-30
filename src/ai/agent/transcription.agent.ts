import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import OpenAI from 'openai';

@Injectable()
export class TranscriptionAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async transcribeAudio(
    audioFile: Express.Multer.File,
    language?: string,
    prompt?: string,
  ): Promise<string> {
    try {
      if (!audioFile) {
        throw new BadRequestException('Audio file is required');
      }

      // Validate file type
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

      if (!allowedMimeTypes.includes(audioFile.mimetype)) {
        throw new BadRequestException(
          'Invalid audio format. Supported formats: MP3, WAV, M4A, MP4, WebM, OGG, FLAC',
        );
      }

      // Check file size (max 25MB as per OpenAI limits)
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (audioFile.size > maxSize) {
        throw new BadRequestException('Audio file must be less than 25MB');
      }

      // Prepare transcription request
      const transcriptionOptions: any = {
        file: fs.createReadStream(audioFile.path),
        model: 'whisper-1',
        response_format: 'text',
      };

      if (language) {
        transcriptionOptions.language = language;
      }

      if (prompt) {
        transcriptionOptions.prompt = prompt;
      }

      // Call OpenAI Whisper API
      const transcription =
        await this.openai.audio.transcriptions.create(transcriptionOptions);

      // Clean up temporary file
      if (fs.existsSync(audioFile.path)) {
        fs.unlinkSync(audioFile.path);
      }

      // The transcription response is a string when response_format is 'text'
      const transcriptionText = transcription as unknown as string;

      if (!transcriptionText || typeof transcriptionText !== 'string') {
        throw new BadRequestException('Failed to transcribe audio');
      }

      return transcriptionText.trim();
    } catch (error) {
      // Clean up temporary file in case of error
      if (audioFile?.path && fs.existsSync(audioFile.path)) {
        fs.unlinkSync(audioFile.path);
      }

      console.error('Error transcribing audio:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to transcribe audio file');
    }
  }
}
