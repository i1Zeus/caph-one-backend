import { BadRequestException, Injectable } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import OpenAI from 'openai';

export interface TaskCreationResult {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId: string;
  taskStageId?: string;
  parentId?: string;
  assigneeIds?: string[];
  assignees?: Array<{ id: string; name: string; email: string }>; // Add assignee details
  mentionedNames?: string[]; // Add this field to store extracted names
  order?: number;
}

@Injectable()
export class TaskCreationAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async convertTextToTask(
    text: string,
    projectId: string,
    additionalContext?: string,
    taskStageId?: string,
    parentId?: string,
  ): Promise<TaskCreationResult> {
    try {
      if (!text || !text.trim()) {
        throw new BadRequestException('Text content is required');
      }

      if (!projectId) {
        throw new BadRequestException('Project ID is required');
      }

      // Get current date for relative date parsing
      const currentDate = new Date();
      const currentDateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentYear = currentDate.getFullYear();

      const prompt = `
You are an expert task analyzer. Convert the following text into a structured task JSON that matches this exact format.

CURRENT DATE CONTEXT:
- Today's date: ${currentDateString}
- Current year: ${currentYear}
- Use this context to resolve relative dates like "tomorrow", "next week", "in 3 days", etc.

RELATIVE DATE EXAMPLES (based on today being ${currentDateString}):
- "tomorrow" = ${new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- "next week" = ${new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- "in 3 days" = ${new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

Text to analyze: "${text}"
${additionalContext ? `Additional context: ${additionalContext}` : ''}

IMPORTANT RULES:
1. Extract a clear, actionable task title (required, max 100 chars)
2. Create a detailed description based on the content
3. Determine appropriate priority: LOW, MEDIUM, HIGH, CRITICAL
4. Set status (default: PENDING, others: IN_PROGRESS, ON_HOLD, COMPLETED, CANCELED)
5. Extract dates if mentioned (format: YYYY-MM-DD for dates, or YYYY-MM-DDTHH:MM:SS.sssZ for datetime)
6. For relative dates (tomorrow, next week, etc.), calculate the actual date based on today: ${currentDateString}
7. Extract order/sequence number if mentioned
8. Extract any NAMES mentioned in the text that could be potential assignees (first names, full names, or nicknames)
9. ONLY use the exact enum values provided below

VALID ENUM VALUES:
- TaskStatus: PENDING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELED
- TaskPriority: LOW, MEDIUM, HIGH, CRITICAL

NAME EXTRACTION EXAMPLES:
- "Ask John to review this" → ["John", "Jon", "Jonathan", "Johnny", "Jack"]
- "Assign this to Sarah and Mike" → ["Sarah", "Sara", "Mike", "Michael", "Mickey", "Mick"]
- "Have David check with Lisa" → ["David", "Dave", "Dawood", "Lisa", "Liza", "Elizabeth"]
- "Tell the team" → [] (no specific names)
- "Send to john.doe" → ["john.doe", "John", "Jon", "Jonathan"] (include usernames/handles)
- "Contact Yaser about this" → ["Yaser", "Yasser", "Yasir", "Yaseer"]
- "Ask Mohammed for help" → ["Mohammed", "Mohammad", "Muhammad", "Ahmed", "Ahmad"]
- "Tell Chris to handle this" → ["Chris", "Christopher", "Christian", "Christine"]
- "Have Bob review the code" → ["Bob", "Robert", "Rob", "Bobby"]

CRITICAL NAME VARIATION RULES:
For each mentioned name, you MUST generate ALL possible variations including:

1. EXACT SPELLINGS: Different ways the same name can be spelled
   - Mohammad → Mohammad, Mohammed, Muhammad
   - Yaser → Yaser, Yasser, Yasir, Yaseer
   - Catherine → Catherine, Katherine, Kathryn

2. NICKNAMES & SHORTENED FORMS: All common nicknames
   - Michael → Michael, Mike, Mickey, Mick
   - William → William, Will, Bill, Billy
   - Elizabeth → Elizabeth, Liz, Beth, Betty, Lisa

3. PHONETIC VARIATIONS: Names that sound similar
   - Christopher → Christopher, Kristopher, Christofer
   - Steven → Steven, Stephen, Stefan
   - Katherine → Catherine, Katherine, Kathryn

4. CULTURAL VARIATIONS: Same name in different cultures
   - John → John, Jon, Juan, Giovanni, Hans
   - Mary → Mary, Maria, Marie, Miriam
   - Joseph → Joseph, Joe, José, Giuseppe

5. ARABIC/MIDDLE EASTERN PATTERNS:
   - Handle Y/I interchanges: Yasir ↔ Yaser
   - Handle ER/AR endings: Yaser ↔ Yasser
   - Include common variations: Ahmad/Ahmed, Mohammad/Mohammed

6. COMPOUND NAMES: Split compound names
   - "John Smith" → ["John", "Jon", "Jonathan", "Smith"]
   - "Mary Jane" → ["Mary", "Maria", "Marie", "Jane", "Jain"]

IMPORTANT: Be extremely generous with name variations. It's better to include too many variations than to miss a potential match. Always include at least 3-5 variations per mentioned name.

Return ONLY a valid JSON object with this structure:
{
  "title": "string (required, clear and actionable)",
  "description": "string (optional, detailed description)",
  "startDate": "string (optional, YYYY-MM-DD format preferred)",
  "endDate": "string (optional, YYYY-MM-DD format preferred)",
  "status": "TaskStatus (optional, default PENDING)",
  "priority": "TaskPriority (optional, default MEDIUM)",
  "mentionedNames": "array of strings (optional, all name variations and spellings mentioned in text that could be assignees)",
  "order": "number (optional, if sequence/priority mentioned)"
}

Do not include projectId, taskStageId, parentId, or assigneeIds in the response - these will be added separately.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content?.trim();

      if (!responseText) {
        throw new BadRequestException('Failed to generate task data');
      }

      let parsedTask: any;
      try {
        parsedTask = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse AI response:', responseText);
        console.error('Parse error:', parseError);
        throw new BadRequestException(
          'Failed to parse task data from AI response',
        );
      }

      // Validate and sanitize the response
      const result: TaskCreationResult = {
        title: this.validateAndCleanTitle(parsedTask.title),
        projectId: projectId,
      };

      // Add optional fields if present
      if (
        parsedTask.description &&
        typeof parsedTask.description === 'string'
      ) {
        result.description = parsedTask.description.trim();
      }

      if (
        parsedTask.startDate &&
        this.isValidDateString(parsedTask.startDate)
      ) {
        result.startDate = parsedTask.startDate;
      }

      if (parsedTask.endDate && this.isValidDateString(parsedTask.endDate)) {
        result.endDate = parsedTask.endDate;
      }

      if (parsedTask.status && this.isValidTaskStatus(parsedTask.status)) {
        result.status = parsedTask.status as TaskStatus;
      }

      if (
        parsedTask.priority &&
        this.isValidTaskPriority(parsedTask.priority)
      ) {
        result.priority = parsedTask.priority as TaskPriority;
      }

      if (
        parsedTask.order &&
        typeof parsedTask.order === 'number' &&
        parsedTask.order >= 0
      ) {
        result.order = Math.floor(parsedTask.order);
      }

      // Add mentioned names if present
      if (
        parsedTask.mentionedNames &&
        Array.isArray(parsedTask.mentionedNames)
      ) {
        result.mentionedNames = parsedTask.mentionedNames
          .filter(
            (name: any) => typeof name === 'string' && name.trim().length > 0,
          )
          .map((name: string) => name.trim());
      }

      // Add provided optional IDs
      if (taskStageId) {
        result.taskStageId = taskStageId;
      }

      if (parentId) {
        result.parentId = parentId;
      }

      return result;
    } catch (error) {
      console.error('Error converting text to task:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to convert text to task format');
    }
  }

  private validateAndCleanTitle(title: any): string {
    if (!title || typeof title !== 'string') {
      throw new BadRequestException(
        'Task title is required and must be a string',
      );
    }

    const cleanTitle = title.trim();
    if (cleanTitle.length === 0) {
      throw new BadRequestException('Task title cannot be empty');
    }

    if (cleanTitle.length > 200) {
      return cleanTitle.substring(0, 200).trim();
    }

    return cleanTitle;
  }

  private isValidDateString(date: string): boolean {
    try {
      const parsed = new Date(date);
      // Accept both date formats: YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS.sssZ
      const isValidDate = !isNaN(parsed.getTime());
      const isDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(date); // YYYY-MM-DD
      const isDateTimeFormat = date.includes('T'); // YYYY-MM-DDTHH:MM:SS.sssZ

      return isValidDate && (isDateFormat || isDateTimeFormat);
    } catch {
      return false;
    }
  }

  private isValidTaskStatus(status: string): boolean {
    const validStatuses = [
      'PENDING',
      'IN_PROGRESS',
      'ON_HOLD',
      'COMPLETED',
      'CANCELED',
    ];
    return validStatuses.includes(status);
  }

  private isValidTaskPriority(priority: string): boolean {
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return validPriorities.includes(priority);
  }
}
