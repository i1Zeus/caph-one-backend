import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { Auth } from '../../auth';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentsService } from './comments.service';

@Controller('comments')
@Auth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCommentDto: CreateCommentDto, @Request() req: any) {
    console.log('Request user:', req.user); // Debug logging
    const authorId = req.user?.userId; // Extract user ID from authenticated request
    console.log('Author ID:', authorId); // Debug logging

    if (!authorId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.commentsService.create(createCommentDto, authorId);
  }

  @Get('task/:taskId')
  getTaskComments(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.commentsService.getTaskComments(taskId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.commentsService.update(id, updateCommentDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.commentsService.remove(id, userId);
  }
}
