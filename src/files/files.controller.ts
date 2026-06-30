import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../auth/decorators/universal-auth.decorator';
import {
  GeneratePresignedUrlDto,
  GetAllFilesDto,
  GetFilesByEntityDto,
  GetFileStatsDto,
  UpdateFileDto,
  UploadFileDto,
} from './dto';
import { FilesService } from './files.service';

@Controller('files')
@Auth() // 🔥 Protects ALL endpoints with files:* permissions!
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @Auth('create') // Explicit: files:create
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // File size limit (5GB)
    const maxSize = 5 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5GB limit');
    }

    // File type validation - Allow all files except potentially dangerous ones
    const blockedMimeTypes = [
      // Potentially dangerous executable files (you can modify this list as needed)
      'application/x-msdownload', // .exe
      'application/x-msdos-program', // .exe
      'application/x-winexe', // .exe
      'application/x-ms-dos-executable', // .exe
      'application/vnd.microsoft.portable-executable', // .exe
    ];

    // Optional: Also block by file extension for extra security
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif'];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (
      blockedMimeTypes.includes(file.mimetype) ||
      blockedExtensions.includes(fileExtension)
    ) {
      throw new BadRequestException(
        'File type not allowed for security reasons',
      );
    }

    return this.filesService.uploadFile(
      file,
      req.user.userId,
      uploadFileDto.entityType,
      uploadFileDto.entityId,
    );
  }

  // Admin-only route for viewing all documents
  @Get('all')
  @Auth('read') // Requires: files:read permission
  async getAllFiles(@Query() getAllFilesDto: GetAllFilesDto) {
    return this.filesService.getAllFiles(getAllFilesDto);
  }

  @Get('entity/:entityType/:entityId')
  // Inherited: files:read
  async getFilesByEntity(
    @Param('entityType') entityType: 'project' | 'task' | 'comment',
    @Param('entityId') entityId: string,
  ) {
    const dto: GetFilesByEntityDto = { entityType, entityId };
    return this.filesService.getFilesByEntity(dto.entityType, dto.entityId);
  }

  @Get('stats/all')
  // Inherited: files:read
  async getAllFileStats(@Query() getFileStatsDto: GetFileStatsDto) {
    return this.filesService.getFileStats(
      getFileStatsDto.entityType,
      getFileStatsDto.entityId,
    );
  }

  @Get('stats/:entityType/:entityId')
  // Inherited: files:read
  async getFileStatsByEntity(
    @Param('entityType') entityType: 'project' | 'task' | 'comment',
    @Param('entityId') entityId: string,
  ) {
    return this.filesService.getFileStats(entityType, entityId);
  }

  // Bulk delete files (must come before :id routes)
  @Delete('bulk')
  @Auth('delete') // Explicit: files:delete
  async bulkDeleteFiles(@Body() body: { fileIds: string[] }, @Request() req) {
    return this.filesService.bulkDeleteFiles(body.fileIds, req.user.userId);
  }

  // Parameterized routes last
  @Get(':id')
  // Inherited: files:read
  async getFile(@Param('id') id: string) {
    return this.filesService.getFile(id);
  }

  @Get(':id/download')
  // Inherited: files:read
  async generateDownloadUrl(
    @Param('id') id: string,
    @Query() generatePresignedUrlDto: GeneratePresignedUrlDto,
  ) {
    return this.filesService.generatePresignedUrl(
      id,
      generatePresignedUrlDto.expiresIn,
    );
  }

  // Update file metadata
  @Put(':id')
  // Inherited: files:update
  async updateFile(
    @Param('id') id: string,
    @Body() updateFileDto: UpdateFileDto,
    @Request() req,
  ) {
    return this.filesService.updateFile(id, updateFileDto, req.user.userId);
  }

  // Delete file
  @Delete(':id')
  // Inherited: files:delete
  async deleteFile(@Param('id') id: string, @Request() req) {
    return this.filesService.deleteFile(id, req.user.userId);
  }
}
