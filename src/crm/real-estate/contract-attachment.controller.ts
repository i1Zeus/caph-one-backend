import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../../auth';
import { FilesService } from '../../files/files.service';
import { ContractAttachmentService } from './contract-attachment.service';
import {
  CreateContractAttachmentDto,
  UpdateContractAttachmentDto,
} from './dto';

@Controller('crm/property-contracts/:contractId/attachments')
@Auth()
export class ContractAttachmentController {
  constructor(
    private readonly attachmentService: ContractAttachmentService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Upload and create a new attachment
   */
  @Post('upload')
  @Auth('create')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('contractId', ParseIntPipe) contractId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; description?: string },
    @Request() req,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const userId = req.user?.userId || req.user?.id;

    // Upload file using FilesService
    const uploadedFile = await this.filesService.uploadFile(
      file,
      userId,
      'contract',
      contractId.toString(),
    );

    // Create attachment record
    const createDto: CreateContractAttachmentDto = {
      contractId,
      fileName: file.originalname,
      fileUrl: uploadedFile.url,
      fileKey: uploadedFile.key,
      fileSize: file.size,
      mimetype: file.mimetype,
      title: body.title,
      description: body.description,
    };

    return this.attachmentService.create(createDto, userId);
  }

  /**
   * Create attachment from existing file URL
   */
  @Post()
  @Auth('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('contractId', ParseIntPipe) contractId: number,
    @Body() createDto: Omit<CreateContractAttachmentDto, 'contractId'>,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.attachmentService.create({ ...createDto, contractId }, userId);
  }

  /**
   * Get all attachments for a contract
   */
  @Get()
  @Auth('read')
  async findAll(@Param('contractId', ParseIntPipe) contractId: number) {
    return this.attachmentService.findByContractId(contractId);
  }

  /**
   * Get a single attachment
   */
  @Get(':id')
  @Auth('read')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attachmentService.findOne(id);
  }

  /**
   * Update an attachment
   */
  @Patch(':id')
  @Auth('update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateContractAttachmentDto,
  ) {
    return this.attachmentService.update(id, updateDto);
  }

  /**
   * Delete an attachment
   */
  @Delete(':id')
  @Auth('delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.attachmentService.remove(id);
  }
}
