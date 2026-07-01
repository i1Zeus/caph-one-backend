import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  TaskCreationAgent,
  TaskCreationResult,
} from './agent/task-creation.agent';
import { TranscriptionAgent } from './agent/transcription.agent';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private readonly transcriptionAgent: TranscriptionAgent,
    private readonly taskCreationAgent: TaskCreationAgent,
    private readonly prisma: PrismaService, private tenantPrisma: TenantPrismaService,
    private readonly usersService: UsersService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Get workspace ID from project ID for user searching
   */
  private async getWorkspaceIdFromProject(
    projectId: string,
  ): Promise<string | null> {
    try {
      const project = await this.tenantPrisma.client.project.findUnique({
        where: {
          id: projectId,
          isDeleted: false,
        },
        select: { workspaceId: true },
      });
      return project?.workspaceId || null;
    } catch (error) {
      console.error('Error getting workspace ID from project:', error);
      return null;
    }
  }

  async generateTaskDescription(
    title: string,
    additionalContext?: string,
  ): Promise<string> {
    try {
      const prompt = `
Create a concise task description for: "${title}"
${additionalContext ? `Additional context: ${additionalContext}` : ''}

Requirements:
- Start with a clear 1-2 sentence overview
- Add 2-4 key requirements as bullet points
- Use proper markdown formatting
- Keep it actionable and specific
- Stay brief but informative

Format:
Write a short description of what needs to be accomplished.

**Requirements:**
- First key requirement
- Second key requirement
- Third key requirement (if needed)

Example:
Develop a user registration system with secure authentication.

**Requirements:**
- Create registration form with email/password fields
- Implement email verification workflow
- Add input validation and error handling
- Design responsive UI components`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      const generatedText =
        completion.choices[0]?.message?.content?.trim() ||
        'Failed to generate description';
      return generatedText;
    } catch (error) {
      console.error('Error generating task description:', error);
      throw new BadRequestException('Failed to generate task description');
    }
  }

  async enhanceText(
    text: string,
    operation: 'enhance' | 'professionalize' | 'shorten' | 'expand',
  ): Promise<string> {
    try {
      let prompt = '';

      switch (operation) {
        case 'enhance':
          prompt = `
Improve this text for clarity and readability while keeping it concise:

"${text}"

Requirements:
- Make the language clearer and more precise
- Fix any grammar or structure issues
- Keep the same length or slightly shorter
- Use proper markdown formatting
- Maintain the original meaning
- Make it more engaging and actionable

Return the enhanced version with better structure and clarity.
`;
          break;

        case 'professionalize':
          prompt = `
Rewrite this text to sound more professional and polished:

"${text}"

Requirements:
- Use professional business language
- Maintain a formal but approachable tone
- Keep it concise and direct
- Use proper markdown formatting
- Remove any casual language
- Make it suitable for workplace communication

Return a professional version that sounds authoritative yet clear.
`;
          break;

        case 'shorten':
          prompt = `
Condense this text to its essential points:

"${text}"

Requirements:
- Keep only the most important information
- Remove redundancy and filler words
- Make it 50-70% shorter
- Use proper markdown formatting
- Maintain core meaning
- Use bullet points if it helps brevity

Return a concise version with just the key points.
`;
          break;

        case 'expand':
          prompt = `
Add more detail and context to this text:

"${text}"

Requirements:
- Add helpful details and examples
- Provide more context and background
- Include practical steps or considerations
- Use proper markdown formatting with headers/lists
- Make it about 50% longer (not excessively long)
- Keep it focused and relevant

Return an expanded version with useful additional information.
`;
          break;

        default:
          throw new BadRequestException('Invalid operation type');
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens:
          operation === 'expand' ? 500 : operation === 'shorten' ? 250 : 400,
      });

      const generatedText =
        completion.choices[0]?.message?.content?.trim() ||
        'Failed to process text';
      return generatedText;
    } catch (error) {
      console.error('Error enhancing text:', error);
      throw new BadRequestException('Failed to enhance text');
    }
  }

  async generateSuggestions(context: string): Promise<string[]> {
    try {
      const prompt = `
Based on the following context, generate 3-5 brief and actionable suggestions for task titles or improvements:

Context: "${context}"

Provide only a list of suggestions, one per line, without numbering or bullet points.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const responseText =
        completion.choices[0]?.message?.content?.trim() || '';
      const suggestions =
        responseText.split('\n').filter((line) => line.trim()) || [];
      return suggestions.slice(0, 5); // Limit to 5 suggestions
    } catch (error) {
      console.error('Error generating suggestions:', error);
      throw new BadRequestException('Failed to generate suggestions');
    }
  }

  async transcribeAudio(
    audioFile: Express.Multer.File,
    language?: string,
    prompt?: string,
  ): Promise<string> {
    return this.transcriptionAgent.transcribeAudio(audioFile, language, prompt);
  }

  async convertTextToTask(
    text: string,
    projectId: string,
    additionalContext?: string,
    taskStageId?: string,
    parentId?: string,
  ): Promise<TaskCreationResult> {
    const taskResult = await this.taskCreationAgent.convertTextToTask(
      text,
      projectId,
      additionalContext,
      taskStageId,
      parentId,
    );

    // If names were mentioned, try to find matching users in the workspace
    if (taskResult.mentionedNames && taskResult.mentionedNames.length > 0) {
      const workspaceId = await this.getWorkspaceIdFromProject(projectId);

      if (workspaceId) {
        try {
          // Use AI-generated name variations directly (AI handles all variations now)
          console.log(
            'AI-generated name variations:',
            taskResult.mentionedNames,
          );

          const matchedUsers = await this.usersService.searchUsersByNames(
            taskResult.mentionedNames,
            workspaceId,
          );

          if (matchedUsers.length > 0) {
            taskResult.assigneeIds = matchedUsers.map((user) => user.id);
            taskResult.assignees = matchedUsers; // Also include full user details

            console.log(
              'Successfully matched users:',
              matchedUsers.map((u) => `${u.name} (${u.email})`),
            );
          } else {
            console.log('No users found matching the mentioned names');
          }
        } catch (error) {
          console.error('Error searching for users by names:', error);
          // Don't fail the task creation if user search fails
        }
      }
    }

    return taskResult;
  }

  async transcribeAndCreateTask(
    audioFile: Express.Multer.File,
    projectId: string,
    language?: string,
    prompt?: string,
    additionalContext?: string,
    taskStageId?: string,
    parentId?: string,
  ): Promise<{ transcription: string; task: TaskCreationResult }> {
    try {
      // First transcribe the audio
      const transcription = await this.transcribeAudio(
        audioFile,
        language,
        prompt,
      );

      // Then convert the transcription to a task
      const task = await this.convertTextToTask(
        transcription,
        projectId,
        additionalContext,
        taskStageId,
        parentId,
      );

      return {
        transcription,
        task,
      };
    } catch (error) {
      console.error('Error in transcribe and create task:', error);
      throw error;
    }
  }
}
