import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly octokit: Octokit;
  private readonly orgName: string;

  constructor(private configService: ConfigService) {
    const githubToken = this.configService.get<string>('GITHUB_TOKEN');
    this.orgName =
      this.configService.get<string>('GITHUB_ORG_NAME') || 'izeus-org';

    if (!githubToken) {
      this.logger.warn('GITHUB_TOKEN not found in environment variables');
    }

    this.octokit = new Octokit({
      auth: githubToken,
    });
  }

  async getOrgRepositories() {
    try {
      this.logger.log(
        `Fetching repositories for organization: ${this.orgName}`,
      );

      const repos = await this.octokit.paginate('GET /orgs/{org}/repos', {
        org: this.orgName,
        type: 'all',
        per_page: 100,
      });

      const formattedRepos = repos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        language: repo.language,
        forksCount: repo.forks_count,
        stargazersCount: repo.stargazers_count,
        openIssuesCount: repo.open_issues_count,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
      }));

      this.logger.log(
        `Successfully fetched ${formattedRepos.length} repositories`,
      );
      return {
        total: formattedRepos.length,
        repositories: formattedRepos,
      };
    } catch (error: any) {
      this.logger.error(
        'Error fetching repositories:',
        error.response?.data || error.message,
      );
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  async createGithubIssue(issueData: {
    title: string;
    description: string;
    repository: string;
    assignee?: string;
    labels?: string[];
  }) {
    try {
      const { title, description, repository, assignee, labels } = issueData;

      this.logger.log(`Creating GitHub issue: ${title} in ${repository}`);

      const githubIssueData: any = {
        owner: this.orgName,
        repo: repository,
        title,
        body: description,
      };

      if (assignee) {
        githubIssueData.assignee = assignee;
      }

      if (labels && labels.length > 0) {
        githubIssueData.labels = labels;
      }

      const response = await this.octokit.rest.issues.create(githubIssueData);

      this.logger.log(`Successfully created issue #${response.data.number}`);

      return {
        id: response.data.id,
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        state: response.data.state,
        htmlUrl: response.data.html_url,
        assignee: response.data.assignee?.login,
        labels: response.data.labels.map((label: any) => label.name),
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
      };
    } catch (error: any) {
      this.logger.error(
        'Error creating GitHub issue:',
        error.response?.data || error.message,
      );
      throw new Error(`Failed to create GitHub issue: ${error.message}`);
    }
  }
}
