import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentFileType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateContractAttachmentDto,
  UpdateContractAttachmentDto,
} from './dto';

@Injectable()
export class ContractAttachmentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new attachment for a contract
   */
  async create(createDto: CreateContractAttachmentDto, uploadedById: string) {
    // Verify contract exists
    const contract = await this.prisma.propertyContract.findFirst({
      where: { id: createDto.contractId, isDeleted: false },
    });

    if (!contract) {
      throw new NotFoundException(
        `Contract with ID ${createDto.contractId} not found`,
      );
    }

    // Determine file type from mimetype if not provided
    let fileType = createDto.fileType;
    if (!fileType) {
      fileType = this.determineFileType(createDto.mimetype);
    }

    const attachment = await this.prisma.contractAttachment.create({
      data: {
        contractId: createDto.contractId,
        fileName: createDto.fileName,
        fileUrl: createDto.fileUrl,
        fileKey: createDto.fileKey,
        fileSize: createDto.fileSize,
        mimetype: createDto.mimetype,
        fileType: fileType,
        title: createDto.title,
        description: createDto.description,
        uploadedById: uploadedById,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return attachment;
  }

  /**
   * Get all attachments for a contract
   */
  async findByContractId(contractId: number) {
    // Verify contract exists
    const contract = await this.prisma.propertyContract.findFirst({
      where: { id: contractId, isDeleted: false },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    return this.prisma.contractAttachment.findMany({
      where: {
        contractId,
        isDeleted: false,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single attachment by ID
   */
  async findOne(id: number) {
    const attachment = await this.prisma.contractAttachment.findFirst({
      where: { id, isDeleted: false },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    return attachment;
  }

  /**
   * Update an attachment
   */
  async update(id: number, updateDto: UpdateContractAttachmentDto) {
    const attachment = await this.prisma.contractAttachment.findFirst({
      where: { id, isDeleted: false },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    return this.prisma.contractAttachment.update({
      where: { id },
      data: {
        ...(updateDto.title !== undefined && { title: updateDto.title }),
        ...(updateDto.description !== undefined && {
          description: updateDto.description,
        }),
        ...(updateDto.fileType !== undefined && {
          fileType: updateDto.fileType,
        }),
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Delete an attachment (soft delete)
   */
  async remove(id: number) {
    const attachment = await this.prisma.contractAttachment.findFirst({
      where: { id, isDeleted: false },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    await this.prisma.contractAttachment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Determine file type from MIME type
   */
  private determineFileType(mimetype: string): AttachmentFileType {
    if (mimetype.startsWith('image/')) {
      return AttachmentFileType.IMAGE;
    } else if (mimetype === 'application/pdf') {
      return AttachmentFileType.PDF;
    } else if (
      mimetype.includes('document') ||
      mimetype.includes('word') ||
      mimetype.includes('excel') ||
      mimetype.includes('spreadsheet') ||
      mimetype.includes('text')
    ) {
      return AttachmentFileType.DOCUMENT;
    }
    return AttachmentFileType.OTHER;
  }
}
