import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(private readonly githubService: GithubService) {}

  @Get('repositories')
  async getOrgRepositories() {
    try {
      this.logger.log(
        'GET /github/repositories - Fetching organization repositories',
      );
      const result = await this.githubService.getOrgRepositories();

      return {
        success: true,
        message: 'Organization repositories fetched successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error in getOrgRepositories:', error.message);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch organization repositories',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('issues')
  async createGithubIssue(
    @Body()
    issueData: {
      title: string;
      description: string;
      repository: string;
      assignee?: string;
      labels?: string[];
    },
  ) {
    try {
      this.logger.log(
        `POST /github/issues - Creating issue: ${issueData.title}`,
      );
      const result = await this.githubService.createGithubIssue(issueData);

      return {
        success: true,
        message: 'GitHub issue created successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error in createGithubIssue:', error.message);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create GitHub issue',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
