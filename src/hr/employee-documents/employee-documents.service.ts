import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEmployeeDocumentDto,
  GetEmployeeDocumentsDto,
  GetExpiringDocumentsDto,
  UpdateEmployeeDocumentDto,
} from './dto';

@Injectable()
export class EmployeeDocumentsService {
  private s3Client: S3Client;
  private bucketName: string;
  private cdnUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize S3 client for Cloudflare R2
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get('CLOUDFLARE_R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get('CLOUDFLARE_R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get(
          'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
        ),
      },
    });

    this.bucketName = this.configService.get('CLOUDFLARE_R2_BUCKET_NAME');
    this.cdnUrl = this.configService.get('CLOUDFLARE_R2_PUBLIC_URL');
  }

  async create(
    createDto: CreateEmployeeDocumentDto,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    try {
      // Verify employee exists
      const employee = await this.prisma.employee.findUnique({
        where: { id: createDto.employeeId, isDeleted: false },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = `employees/${createDto.employeeId}/documents/${fileName}`;

      // Upload to Cloudflare R2
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      });

      await this.s3Client.send(uploadCommand);

      // Generate public URL
      const url = `${this.cdnUrl}/${key}`;

      // Create document record
      const document = await this.prisma.employeeDocument.create({
        data: {
          employeeId: createDto.employeeId,
          type: createDto.type,
          title: createDto.title,
          description: createDto.description,
          fileUrl: url,
          fileKey: key,
          fileName: file.originalname,
          fileSize: file.size,
          mimetype: file.mimetype,
          issueDate: createDto.issueDate
            ? new Date(createDto.issueDate)
            : undefined,
          expiryDate: createDto.expiryDate
            ? new Date(createDto.expiryDate)
            : undefined,
          uploadedById,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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

      return document;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to upload document: ' + error.message,
      );
    }
  }

  async findAll(dto: GetEmployeeDocumentsDto) {
    const {
      employeeId,
      type,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = dto;

    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [documents, total] = await Promise.all([
      this.prisma.employeeDocument.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              job: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
        orderBy,
      }),
      this.prisma.employeeDocument.count({ where }),
    ]);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.employeeDocument.findUnique({
      where: { id, isDeleted: false },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: {
              select: {
                id: true,
                name: true,
              },
            },
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

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async findByEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, isDeleted: false },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.employeeDocument.findMany({
      where: {
        employeeId,
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

  async update(id: string, updateDto: UpdateEmployeeDocumentDto) {
    // const document = await this.findOne(id);

    const updatedDocument = await this.prisma.employeeDocument.update({
      where: { id },
      data: {
        type: updateDto.type,
        title: updateDto.title,
        description: updateDto.description,
        issueDate: updateDto.issueDate
          ? new Date(updateDto.issueDate)
          : undefined,
        expiryDate: updateDto.expiryDate
          ? new Date(updateDto.expiryDate)
          : undefined,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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

    return updatedDocument;
  }

  async remove(id: string) {
    const document = await this.findOne(id);

    try {
      // Delete from Cloudflare R2
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: document.fileKey,
      });

      await this.s3Client.send(deleteCommand);

      // Soft delete from database
      await this.prisma.employeeDocument.update({
        where: { id },
        data: { isDeleted: true },
      });

      return { message: 'Document deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete document: ' + error.message,
      );
    }
  }

  async getDocumentStats(employeeId?: string) {
    const where: any = {
      isDeleted: false,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const [totalDocuments, documentsByType, totalSize] = await Promise.all([
      this.prisma.employeeDocument.count({ where }),
      this.prisma.employeeDocument.groupBy({
        by: ['type'],
        where,
        _count: {
          type: true,
        },
      }),
      this.prisma.employeeDocument.aggregate({
        where,
        _sum: {
          fileSize: true,
        },
      }),
    ]);

    return {
      totalDocuments,
      totalSize: totalSize._sum.fileSize || 0,
      documentsByType: documentsByType.map((item) => ({
        type: item.type,
        count: item._count.type,
      })),
    };
  }

  async getExpiringDocuments(dto: GetExpiringDocumentsDto) {
    const { daysBeforeExpiry = 30 } = dto;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysBeforeExpiry);

    const documents = await this.prisma.employeeDocument.findMany({
      where: {
        isDeleted: false,
        expiryDate: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: {
              select: {
                id: true,
                name: true,
              },
            },
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
      orderBy: {
        expiryDate: 'asc',
      },
    });

    return {
      documents,
      count: documents.length,
      daysBeforeExpiry,
    };
  }

  async getExpiredDocuments() {
    const today = new Date();

    const documents = await this.prisma.employeeDocument.findMany({
      where: {
        isDeleted: false,
        expiryDate: {
          lt: today,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: {
              select: {
                id: true,
                name: true,
              },
            },
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
      orderBy: {
        expiryDate: 'asc',
      },
    });

    return {
      documents,
      count: documents.length,
    };
  }
}
