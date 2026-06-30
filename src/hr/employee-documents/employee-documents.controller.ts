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
import { Auth } from '../../auth';
import {
  CreateEmployeeDocumentDto,
  GetEmployeeDocumentsDto,
  GetExpiringDocumentsDto,
  UpdateEmployeeDocumentDto,
} from './dto';
import { EmployeeDocumentsService } from './employee-documents.service';

@Controller('hr/employee-documents')
@Auth()
export class EmployeeDocumentsController {
  constructor(private readonly documentsService: EmployeeDocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: CreateEmployeeDocumentDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // File size limit (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Allowed file types for documents
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'File type not allowed. Only PDF, images, Word, and Excel files are accepted.',
      );
    }

    return this.documentsService.create(createDto, file, req.user.userId);
  }

  @Get()
  async findAll(@Query() dto: GetEmployeeDocumentsDto) {
    return this.documentsService.findAll(dto);
  }

  @Get('stats')
  async getStats(@Query('employeeId') employeeId?: string) {
    return this.documentsService.getDocumentStats(employeeId);
  }

  @Get('expiring')
  async getExpiringDocuments(@Query() dto: GetExpiringDocumentsDto) {
    return this.documentsService.getExpiringDocuments(dto);
  }

  @Get('expired')
  async getExpiredDocuments() {
    return this.documentsService.getExpiredDocuments();
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string) {
    return this.documentsService.findByEmployee(employeeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeDocumentDto,
  ) {
    return this.documentsService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
