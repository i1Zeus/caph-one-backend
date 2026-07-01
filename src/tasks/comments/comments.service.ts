import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { Comment } from '../entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService, private tenantPrisma: TenantPrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
    authorId: string,
  ): Promise<Comment> {
    try {
      // Verify that the task exists
      const task = await this.tenantPrisma.client.task.findFirst({
        where: {
          id: createCommentDto.taskId,
          isDeleted: false,
        },
      });

      if (!task) {
        throw new BadRequestException('Task not found');
      }

      // Verify that the author exists
      const author = await this.tenantPrisma.client.user.findUnique({
        where: { id: authorId },
      });

      if (!author) {
        throw new BadRequestException('Author not found');
      }

      const comment = await this.tenantPrisma.client.comment.create({
        data: {
          content: createCommentDto.content,
          taskId: createCommentDto.taskId,
          authorId: authorId,
          taggedUsers: createCommentDto.taggedUserIds
            ? {
                connect: createCommentDto.taggedUserIds.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          taggedUsers: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          files: {
            where: {
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
          },
          task: {
            select: {
              title: true,
              project: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Send notifications to tagged users
      if (comment.taggedUsers && comment.taggedUsers.length > 0) {
        const authorName = comment.author.name;
        const taskTitle = comment.task.title;
        const projectName = comment.task.project.name;

        for (const taggedUser of comment.taggedUsers) {
          try {
            await this.notificationsService.sendCommentMentionNotification(
              taggedUser.name,
              authorName,
              taskTitle,
              projectName,
              comment.content,
              {
                email: true,
                whatsapp: true,
                emailAddress: taggedUser.email,
                phoneNumber: taggedUser.phone,
              },
              comment.taskId,
            );
          } catch (error) {
            console.error(
              `Failed to send notification to user ${taggedUser.id}:`,
              error,
            );
          }
        }
      }

      return comment;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating comment:', error);
      throw new BadRequestException(`Failed to create comment: ${error}`);
    }
  }

  async getTaskComments(taskId: string): Promise<Comment[]> {
    // Verify task exists
    const task = await this.tenantPrisma.client.task.findFirst({
      where: {
        id: taskId,
        isDeleted: false,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const comments = await this.tenantPrisma.client.comment.findMany({
      where: {
        taskId,
        isDeleted: false,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taggedUsers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
          where: {
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
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return comments;
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.tenantPrisma.client.comment.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taggedUsers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
          where: {
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
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment;
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
  ): Promise<Comment> {
    // Check if comment exists
    const existingComment = await this.tenantPrisma.client.comment.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingComment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Check if user is the owner of the comment
    if (existingComment.authorId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    try {
      const comment = await this.tenantPrisma.client.comment.update({
        where: { id },
        data: {
          content: updateCommentDto.content,
          updatedAt: new Date(),
          ...(updateCommentDto.taggedUserIds && {
            taggedUsers: {
              set: [], // First disconnect all existing tagged users
              connect: updateCommentDto.taggedUserIds.map((id) => ({ id })),
            },
          }),
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          taggedUsers: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          files: {
            where: {
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
          },
        },
      });

      return comment;
    } catch (error) {
      throw new BadRequestException('Failed to update comment');
    }
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    // Check if comment exists
    const existingComment = await this.tenantPrisma.client.comment.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingComment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Check if user is the owner of the comment
    if (existingComment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    try {
      // Soft delete the comment
      await this.tenantPrisma.client.comment.update({
        where: { id },
        data: {
          isDeleted: true,
          updatedAt: new Date(),
        },
      });

      return { message: `Comment with ID ${id} has been deleted` };
    } catch (error) {
      throw new BadRequestException('Failed to delete comment');
    }
  }

  async canUserModifyComment(
    commentId: string,
    userId: string,
  ): Promise<boolean> {
    const comment = await this.tenantPrisma.client.comment.findFirst({
      where: {
        id: commentId,
        isDeleted: false,
      },
    });

    if (!comment) {
      return false;
    }

    return comment.authorId === userId;
  }
}
