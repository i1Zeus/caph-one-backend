import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DynamicPermissionsService } from '../auth/services/dynamic-permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetAllFilesDto, UpdateFileDto } from './dto';

@Injectable()
export class FilesService {
  private s3Client: S3Client;
  private bucketName: string;
  private cdnUrl: string;

  constructor(
    private prisma: PrismaService, private tenantPrisma: TenantPrismaService,
    private configService: ConfigService,
    private permissionsService: DynamicPermissionsService,
  ) {
    // Initialize S3 client for Cloudflare R2
    this.s3Client = new S3Client({
      region: 'auto', // Cloudflare R2 uses 'auto' for region
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

  // Helper method to check if user can manage files (now dynamic!)
  private async canManageFiles(userId: string): Promise<boolean> {
    return await this.permissionsService.userHasResourcePermission(
      userId,
      'files',
      'update',
    );
  }

  // Helper method to check if user can delete files (now dynamic!)
  private async canDeleteFiles(userId: string): Promise<boolean> {
    return await this.permissionsService.userHasResourcePermission(
      userId,
      'files',
      'delete',
    );
  }

  async uploadFile(
    file: Express.Multer.File,
    uploadedById: string,
    entityType?: 'project' | 'task' | 'comment' | 'workspace',
    entityId?: string,
  ) {
    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;

      // Generate key based on entity type or default to general folder
      let key: string;
      if (entityType && entityId) {
        key = `${entityType}s/${entityId}/${fileName}`;
      } else {
        key = `general/${fileName}`;
      }

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

      // Prepare data for database insertion
      const fileData: any = {
        originalName: file.originalname,
        filename: fileName,
        mimetype: file.mimetype,
        size: file.size,
        url,
        key,
        uploadedById,
      };

      // Add entity-specific fields if provided
      if (entityType && entityId) {
        if (entityType === 'project') {
          fileData.projectId = entityId;
        } else if (entityType === 'task') {
          fileData.taskId = entityId;
        } else if (entityType === 'comment') {
          fileData.commentId = entityId;
        }
        // Note: workspace files don't have a specific entity relation
      }

      // Save file metadata to database
      const fileRecord = await this.tenantPrisma.client.file.create({
        data: fileData,
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

      return fileRecord;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to upload file: ' + error.message,
      );
    }
  }

  async getFile(id: string) {
    const file = await this.tenantPrisma.client.file.findFirst({
      where: {
        id,
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
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    return file;
  }

  async getFilesByEntity(
    entityType:
      | 'project'
      | 'task'
      | 'comment'
      | 'workspace'
      | 'contract'
      | 'property'
      | 'lead',
    entityId: string,
  ) {
    const whereClause: any = {
      isDeleted: false,
    };

    if (entityType === 'project') {
      whereClause.projectId = entityId;
    } else if (entityType === 'task') {
      whereClause.taskId = entityId;
    } else if (entityType === 'comment') {
      whereClause.commentId = entityId;
    }

    return this.tenantPrisma.client.file.findMany({
      where: whereClause,
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

  async updateFile(id: string, updateFileDto: UpdateFileDto, userId: string) {
    const file = await this.tenantPrisma.client.file.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Check permissions: file owner or users with files:update permission
    const canManage = await this.canManageFiles(userId);
    if (file.uploadedById !== userId && !canManage) {
      throw new ForbiddenException(
        'You do not have permission to update this file',
      );
    }

    // Update file metadata
    const updatedFile = await this.tenantPrisma.client.file.update({
      where: { id },
      data: {
        originalName: updateFileDto.originalName || file.originalName,
        // Add description field if you want to store it
        // description: updateFileDto.description,
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

    return updatedFile;
  }

  async deleteFile(id: string, userId: string) {
    const file = await this.tenantPrisma.client.file.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Check permissions: file owner or users with files:delete permission
    const canDelete = await this.canDeleteFiles(userId);
    if (file.uploadedById !== userId && !canDelete) {
      throw new ForbiddenException(
        'You do not have permission to delete this file',
      );
    }

    try {
      // Delete from Cloudflare R2
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: file.key,
      });

      await this.s3Client.send(deleteCommand);

      // Soft delete from database
      await this.tenantPrisma.client.file.update({
        where: { id },
        data: { isDeleted: true },
      });

      return { message: 'File deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete file: ' + error.message,
      );
    }
  }

  async bulkDeleteFiles(fileIds: string[], userId: string) {
    if (!fileIds || fileIds.length === 0) {
      throw new BadRequestException('No file IDs provided');
    }

    // Get all files to check permissions
    const files = await this.tenantPrisma.client.file.findMany({
      where: {
        id: { in: fileIds },
        isDeleted: false,
      },
    });

    if (files.length !== fileIds.length) {
      throw new BadRequestException('Some files not found');
    }

    // Check if user can delete all files (users with files:delete can delete any file)
    const canDelete = await this.canDeleteFiles(userId);
    const canDeleteAll = files.every(
      (file) => file.uploadedById === userId || canDelete,
    );

    if (!canDeleteAll) {
      throw new ForbiddenException(
        'You do not have permission to delete some of these files',
      );
    }

    try {
      // Delete from Cloudflare R2
      const deletePromises = files.map((file) => {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: file.key,
        });
        return this.s3Client.send(deleteCommand);
      });

      await Promise.all(deletePromises);

      // Soft delete from database
      await this.tenantPrisma.client.file.updateMany({
        where: {
          id: { in: fileIds },
        },
        data: { isDeleted: true },
      });

      return {
        message: `${files.length} file(s) deleted successfully`,
        deletedCount: files.length,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete files: ' + error.message,
      );
    }
  }

  async generatePresignedUrl(id: string, expiresIn: number = 3600) {
    const file = await this.getFile(id);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: file.key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return {
        url: presignedUrl,
        expiresIn,
        fileName: file.originalName,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to generate presigned URL: ' + error.message,
      );
    }
  }

  async getFileStats(
    entityType?:
      | 'project'
      | 'task'
      | 'comment'
      | 'workspace'
      | 'contract'
      | 'property'
      | 'lead',
    entityId?: string,
  ) {
    const whereClause: any = {
      isDeleted: false,
    };

    if (entityType && entityId) {
      if (entityType === 'project') {
        whereClause.projectId = entityId;
      } else if (entityType === 'task') {
        whereClause.taskId = entityId;
      } else if (entityType === 'comment') {
        whereClause.commentId = entityId;
      }
    }

    const [totalFiles, totalSize] = await Promise.all([
      this.tenantPrisma.client.file.count({ where: whereClause }),
      this.tenantPrisma.client.file.aggregate({
        where: whereClause,
        _sum: {
          size: true,
        },
      }),
    ]);

    return {
      totalFiles,
      totalSize: totalSize._sum.size || 0,
    };
  }

  async getAllFiles(dto: GetAllFilesDto) {
    const {
      page = 1,
      limit = 20,
      search,
      entityType,
      projectId,
      mimetype,
      uploadedBy,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = dto;

    // Ensure page and limit are numbers
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    // Validate converted numbers
    const validPage = Math.max(1, pageNum || 1);
    const validLimit = Math.max(1, Math.min(100, limitNum || 20)); // Cap at 100

    const skip = (validPage - 1) * validLimit;

    // Build where clause
    const whereClause: any = {
      isDeleted: false,
    };

    if (search) {
      whereClause.originalName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Project filter - can show direct project files or task/comment files within that project
    if (projectId) {
      whereClause.OR = [
        { projectId }, // Direct project files
        {
          task: {
            projectId, // Files from tasks in this project
          },
        },
        {
          comment: {
            task: {
              projectId, // Files from comments on tasks in this project
            },
          },
        },
      ];
    }

    if (entityType) {
      if (entityType === 'project') {
        whereClause.projectId = { not: null };
      } else if (entityType === 'task') {
        whereClause.taskId = { not: null };
      } else if (entityType === 'comment') {
        whereClause.commentId = { not: null };
      }
    }

    if (mimetype) {
      whereClause.mimetype = {
        contains: mimetype,
        mode: 'insensitive',
      };
    }

    if (uploadedBy) {
      whereClause.uploadedById = uploadedBy;
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.originalName = sortOrder;
    } else if (sortBy === 'size') {
      orderBy.size = sortOrder;
    } else if (sortBy === 'mimetype') {
      orderBy.mimetype = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Get files and total count
    const [files, totalCount] = await Promise.all([
      this.tenantPrisma.client.file.findMany({
        where: whereClause,
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          comment: {
            select: {
              id: true,
              content: true,
              task: {
                select: {
                  id: true,
                  title: true,
                  project: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: validLimit,
      }),
      this.tenantPrisma.client.file.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / validLimit);

    return {
      files,
      pagination: {
        page: validPage,
        limit: validLimit,
        totalCount,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      },
    };
  }
}
