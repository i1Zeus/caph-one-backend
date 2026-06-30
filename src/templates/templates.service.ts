import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TaskStageTemplate {
  name: string;
  description: string;
  color: string;
  order: number;
  isDefault?: boolean;
}

export interface ProjectStageTemplate {
  name: string;
  description: string;
  color: string;
  order: number;
}

export interface LeadStageTemplate {
  name: string;
  description: string;
  color: string;
  order: number;
}

export interface StageTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | 'development'
    | 'marketing'
    | 'design'
    | 'general'
    | 'agile'
    | 'waterfall'
    | 'sales'
    | 'crm';
  taskStages?: TaskStageTemplate[];
  projectStages?: ProjectStageTemplate[];
  leadStages?: LeadStageTemplate[];
}

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  // Predefined Task Stage Templates
  private readonly taskStageTemplates: StageTemplate[] = [
    {
      id: 'simple-kanban',
      name: 'Simple Kanban',
      description: 'Basic three-column kanban board for simple task management',
      category: 'general',
      taskStages: [
        {
          name: 'To Do',
          description: 'Tasks ready to be started',
          color: '#6B7280',
          order: 0,
          isDefault: true,
        },
        {
          name: 'In Progress',
          description: 'Tasks currently being worked on',
          color: '#3B82F6',
          order: 1,
        },
        {
          name: 'Done',
          description: 'Completed tasks',
          color: '#10B981',
          order: 2,
        },
      ],
    },
    {
      id: 'agile-scrum',
      name: 'Agile Scrum',
      description: 'Standard Agile Scrum workflow for development teams',
      category: 'agile',
      taskStages: [
        {
          name: 'Backlog',
          description: 'Product backlog items',
          color: '#6B7280',
          order: 0,
          isDefault: true,
        },
        {
          name: 'Sprint Backlog',
          description: 'Tasks selected for current sprint',
          color: '#8B5CF6',
          order: 1,
        },
        {
          name: 'In Progress',
          description: 'Tasks being actively developed',
          color: '#3B82F6',
          order: 2,
        },
        {
          name: 'Code Review',
          description: 'Tasks awaiting code review',
          color: '#F59E0B',
          order: 3,
        },
        {
          name: 'Testing',
          description: 'Tasks in testing phase',
          color: '#EF4444',
          order: 4,
        },
        {
          name: 'Done',
          description: 'Completed and verified tasks',
          color: '#10B981',
          order: 5,
        },
      ],
    },
    {
      id: 'implementation-flow',
      name: 'Implementation Flow',
      description:
        'Complete implementation lifecycle with training and cancellation options',
      category: 'development',
      taskStages: [
        {
          name: 'Implementation',
          description: 'Initial implementation and setup tasks',
          color: '#6B7280',
          order: 0,
          isDefault: true,
        },
        {
          name: 'Development',
          description: 'Active development and customization tasks',
          color: '#3B82F6',
          order: 1,
        },
        {
          name: 'Testing',
          description: 'Quality assurance and testing tasks',
          color: '#F59E0B',
          order: 2,
        },
        {
          name: 'Training',
          description: 'User training and documentation tasks',
          color: '#8B5CF6',
          order: 3,
        },
        {
          name: 'Done',
          description: 'Successfully completed tasks',
          color: '#10B981',
          order: 4,
        },
        {
          name: 'Cancel',
          description: 'Cancelled or terminated tasks',
          color: '#EF4444',
          order: 5,
        },
      ],
    },
    {
      id: 'development-flow',
      name: 'Development Workflow',
      description:
        'Comprehensive development workflow from design to deployment',
      category: 'development',
      taskStages: [
        {
          name: 'Design',
          description: 'UI/UX design and planning',
          color: '#EC4899',
          order: 0,
          isDefault: true,
        },
        {
          name: 'Development',
          description: 'Active coding and implementation',
          color: '#3B82F6',
          order: 1,
        },
        {
          name: 'Review',
          description: 'Code review and feedback',
          color: '#F59E0B',
          order: 2,
        },
        {
          name: 'Testing',
          description: 'Quality assurance and testing',
          color: '#EF4444',
          order: 3,
        },
        {
          name: 'Staging',
          description: 'Deployed to staging environment',
          color: '#8B5CF6',
          order: 4,
        },
        {
          name: 'Production',
          description: 'Live and deployed',
          color: '#10B981',
          order: 5,
        },
      ],
    },
    {
      id: 'marketing-campaign',
      name: 'Marketing Campaign',
      description: 'Marketing campaign workflow from planning to analysis',
      category: 'marketing',
      taskStages: [
        {
          name: 'Strategy',
          description: 'Campaign planning and strategy',
          color: '#8B5CF6',
          order: 0,
          isDefault: true,
        },
        {
          name: 'Creative',
          description: 'Content creation and design',
          color: '#EC4899',
          order: 1,
        },
        {
          name: 'Review',
          description: 'Content review and approval',
          color: '#F59E0B',
          order: 2,
        },
        {
          name: 'Launch',
          description: 'Campaign execution and launch',
          color: '#3B82F6',
          order: 3,
        },
        {
          name: 'Monitor',
          description: 'Performance monitoring',
          color: '#EF4444',
          order: 4,
        },
        {
          name: 'Analyze',
          description: 'Results analysis and reporting',
          color: '#10B981',
          order: 5,
        },
      ],
    },
    {
      id: 'design-process',
      name: 'Design Process',
      description: 'Creative design workflow from concept to delivery',
      category: 'design',
      taskStages: [
        {
          name: 'Research',
          description: 'User research and requirements',
          color: '#6B7280',
          order: 0,
          isDefault: true,
        },
        {
          name: 'Ideation',
          description: 'Brainstorming and concept creation',
          color: '#8B5CF6',
          order: 1,
        },
        {
          name: 'Wireframes',
          description: 'Low-fidelity wireframes',
          color: '#F59E0B',
          order: 2,
        },
        {
          name: 'Design',
          description: 'High-fidelity design creation',
          color: '#EC4899',
          order: 3,
        },
        {
          name: 'Prototype',
          description: 'Interactive prototypes',
          color: '#3B82F6',
          order: 4,
        },
        {
          name: 'Review',
          description: 'Stakeholder review and feedback',
          color: '#EF4444',
          order: 5,
        },
        {
          name: 'Final',
          description: 'Final deliverables',
          color: '#10B981',
          order: 6,
        },
      ],
    },
    {
      id: 'waterfall',
      name: 'Waterfall Model',
      description: 'Traditional waterfall project management approach',
      category: 'waterfall',
      taskStages: [
        {
          name: 'Requirements',
          description: 'Requirements gathering and analysis',
          color: '#6B7280',
          order: 0,
          isDefault: true,
        },
        {
          name: 'Design',
          description: 'System design and architecture',
          color: '#8B5CF6',
          order: 1,
        },
        {
          name: 'Implementation',
          description: 'Development and coding',
          color: '#3B82F6',
          order: 2,
        },
        {
          name: 'Verification',
          description: 'Testing and quality assurance',
          color: '#F59E0B',
          order: 3,
        },
        {
          name: 'Maintenance',
          description: 'Deployment and maintenance',
          color: '#10B981',
          order: 4,
        },
      ],
    },
  ];

  // Predefined Project Stage Templates
  private readonly projectStageTemplates: StageTemplate[] = [
    {
      id: 'basic-project-flow',
      name: 'Basic Project Flow',
      description: 'Simple three-stage project lifecycle',
      category: 'general',
      projectStages: [
        {
          name: 'Planning',
          description: 'Project planning and preparation',
          color: '#6B7280',
          order: 0,
        },
        {
          name: 'Active',
          description: 'Active development and work',
          color: '#3B82F6',
          order: 1,
        },
        {
          name: 'Completed',
          description: 'Finished projects',
          color: '#10B981',
          order: 2,
        },
      ],
    },
    {
      id: 'development-lifecycle',
      name: 'Development Lifecycle',
      description: 'Complete software development project stages',
      category: 'development',
      projectStages: [
        {
          name: 'Proposal',
          description: 'Project proposals and approval',
          color: '#6B7280',
          order: 0,
        },
        {
          name: 'Planning',
          description: 'Detailed planning and design',
          color: '#8B5CF6',
          order: 1,
        },
        {
          name: 'Development',
          description: 'Active development phase',
          color: '#3B82F6',
          order: 2,
        },
        {
          name: 'Testing',
          description: 'Quality assurance and testing',
          color: '#F59E0B',
          order: 3,
        },
        {
          name: 'Deployment',
          description: 'Production deployment',
          color: '#EF4444',
          order: 4,
        },
        {
          name: 'Maintenance',
          description: 'Ongoing maintenance and support',
          color: '#10B981',
          order: 5,
        },
      ],
    },
    {
      id: 'implementation-flow',
      name: 'Implementation Flow',
      description:
        'Complete implementation lifecycle with training and cancellation options',
      category: 'development',
      projectStages: [
        {
          name: 'Implementation',
          description: 'Initial implementation and setup phase',
          color: '#6B7280',
          order: 0,
        },
        {
          name: 'Development',
          description: 'Active development and customization',
          color: '#3B82F6',
          order: 1,
        },
        {
          name: 'Testing',
          description: 'Quality assurance and testing',
          color: '#F59E0B',
          order: 2,
        },
        {
          name: 'Training',
          description: 'User training and documentation',
          color: '#8B5CF6',
          order: 3,
        },
        {
          name: 'Done',
          description: 'Successfully completed projects',
          color: '#10B981',
          order: 4,
        },
        {
          name: 'Cancel',
          description: 'Cancelled or terminated projects',
          color: '#EF4444',
          order: 5,
        },
      ],
    },
    {
      id: 'marketing-funnel',
      name: 'Marketing Funnel',
      description: 'Marketing project stages from awareness to conversion',
      category: 'marketing',
      projectStages: [
        {
          name: 'Research',
          description: 'Market research and analysis',
          color: '#6B7280',
          order: 0,
        },
        {
          name: 'Strategy',
          description: 'Campaign strategy development',
          color: '#8B5CF6',
          order: 1,
        },
        {
          name: 'Creative',
          description: 'Content and creative development',
          color: '#EC4899',
          order: 2,
        },
        {
          name: 'Launch',
          description: 'Campaign launch and execution',
          color: '#3B82F6',
          order: 3,
        },
        {
          name: 'Optimize',
          description: 'Performance optimization',
          color: '#F59E0B',
          order: 4,
        },
        {
          name: 'Report',
          description: 'Results and reporting',
          color: '#10B981',
          order: 5,
        },
      ],
    },
    {
      id: 'design-project',
      name: 'Design Project',
      description: 'Design project workflow from brief to delivery',
      category: 'design',
      projectStages: [
        {
          name: 'Brief',
          description: 'Project brief and requirements',
          color: '#6B7280',
          order: 0,
        },
        {
          name: 'Research',
          description: 'Research and discovery phase',
          color: '#8B5CF6',
          order: 1,
        },
        {
          name: 'Concept',
          description: 'Concept development',
          color: '#EC4899',
          order: 2,
        },
        {
          name: 'Design',
          description: 'Design execution',
          color: '#3B82F6',
          order: 3,
        },
        {
          name: 'Review',
          description: 'Client review and revisions',
          color: '#F59E0B',
          order: 4,
        },
        {
          name: 'Delivery',
          description: 'Final delivery and handoff',
          color: '#10B981',
          order: 5,
        },
      ],
    },
    {
      id: 'agile-project',
      name: 'Agile Project',
      description: 'Agile project management stages',
      category: 'agile',
      projectStages: [
        {
          name: 'Initiation',
          description: 'Project initiation and team setup',
          color: '#6B7280',
          order: 0,
        },
        {
          name: 'Sprint 1',
          description: 'First development sprint',
          color: '#3B82F6',
          order: 1,
        },
        {
          name: 'Sprint 2',
          description: 'Second development sprint',
          color: '#3B82F6',
          order: 2,
        },
        {
          name: 'Sprint 3',
          description: 'Third development sprint',
          color: '#3B82F6',
          order: 3,
        },
        {
          name: 'Testing',
          description: 'Integration testing phase',
          color: '#F59E0B',
          order: 4,
        },
        {
          name: 'Release',
          description: 'Production release',
          color: '#10B981',
          order: 5,
        },
      ],
    },
  ];

  // Predefined Lead Stage Templates (CRM)
  private readonly leadStageTemplates: StageTemplate[] = [
    {
      id: 'simple-sales-funnel',
      name: 'Simple Sales Funnel',
      description: 'Basic 5-stage sales pipeline for general use',
      category: 'sales',
      leadStages: [
        {
          name: 'New Lead',
          description: 'Fresh leads requiring initial contact',
          color: '#6B7280',
          order: 0,
        },
        {
          name: 'Qualified',
          description: 'Qualified prospects with confirmed interest',
          color: '#3B82F6',
          order: 1,
        },
        {
          name: 'Proposal',
          description: 'Proposal sent and under review',
          color: '#F59E0B',
          order: 2,
        },
        {
          name: 'Negotiation',
          description: 'Active negotiation and discussions',
          color: '#EF4444',
          order: 3,
        },
        {
          name: 'Closed Won',
          description: 'Successfully closed deals',
          color: '#10B981',
          order: 4,
        },
        {
          name: 'Closed Lost',
          description: 'Deals that were not closed',
          color: '#DC2626',
          order: 5,
        },
      ],
    },
    {
      id: 'detailed-crm-pipeline',
      name: 'Detailed CRM Pipeline',
      description: 'Comprehensive sales pipeline with detailed stages',
      category: 'crm',
      leadStages: [
        {
          name: 'Lead',
          description: 'Initial lead capture',
          color: '#6B7280',
          order: 0,
        },
        {
          name: 'Contact Made',
          description: 'First contact established',
          color: '#8B5CF6',
          order: 1,
        },
        {
          name: 'Needs Analysis',
          description: 'Understanding customer needs',
          color: '#3B82F6',
          order: 2,
        },
        {
          name: 'Quote Sent',
          description: 'Formal quote provided',
          color: '#F59E0B',
          order: 3,
        },
        {
          name: 'Follow Up',
          description: 'Following up on quote',
          color: '#EC4899',
          order: 4,
        },
        {
          name: 'Negotiation',
          description: 'Price and terms negotiation',
          color: '#EF4444',
          order: 5,
        },
        {
          name: 'Contract Sent',
          description: 'Contract sent for signature',
          color: '#059669',
          order: 6,
        },
        {
          name: 'Won',
          description: 'Deal successfully closed',
          color: '#10B981',
          order: 7,
        },
        {
          name: 'Lost',
          description: 'Deals that were not closed',
          color: '#DC2626',
          order: 8,
        },
      ],
    },
  ];

  // Get all available templates
  getTaskStageTemplates(): StageTemplate[] {
    return this.taskStageTemplates;
  }

  getProjectStageTemplates(): StageTemplate[] {
    return this.projectStageTemplates;
  }

  getTemplatesByCategory(category: string): {
    taskStages: StageTemplate[];
    projectStages: StageTemplate[];
  } {
    return {
      taskStages: this.taskStageTemplates.filter(
        (t) => t.category === category,
      ),
      projectStages: this.projectStageTemplates.filter(
        (t) => t.category === category,
      ),
    };
  }

  // Apply task stage template to a project
  async applyTaskStageTemplate(
    projectId: string,
    templateId: string,
  ): Promise<any[]> {
    // Verify project exists
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        isDeleted: false,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if project already has stages
    const existingStages = await this.prisma.taskStage.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
    });

    if (existingStages.length > 0) {
      throw new BadRequestException(
        'Project already has task stages. Please delete existing stages first.',
      );
    }

    // Find template
    const template = this.taskStageTemplates.find((t) => t.id === templateId);
    if (!template || !template.taskStages) {
      throw new NotFoundException('Task stage template not found');
    }

    try {
      // Create stages from template using transaction for consistency
      const createdStages = await this.prisma.$transaction(async (prisma) => {
        const stages = [];

        for (const stageTemplate of template.taskStages) {
          const stage = await prisma.taskStage.create({
            data: {
              name: stageTemplate.name,
              description: stageTemplate.description,
              color: stageTemplate.color,
              order: stageTemplate.order,
              projectId: projectId,
              isDefault: stageTemplate.isDefault || false,
            },
          });
          stages.push(stage);
        }

        return stages;
      });

      return createdStages;
    } catch (error) {
      console.error('Error applying task stage template:', error);
      throw new BadRequestException('Failed to apply task stage template');
    }
  }

  // Apply project stage template to a workspace
  async applyProjectStageTemplate(
    workspaceId: string,
    templateId: string,
  ): Promise<any[]> {
    // Verify workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if workspace already has stages
    const existingStages = await this.prisma.projectStage.findMany({
      where: {
        workspaceId,
        isDeleted: false,
      },
    });

    if (existingStages.length > 0) {
      throw new BadRequestException(
        'Workspace already has project stages. Please delete existing stages first.',
      );
    }

    // Find template
    const template = this.projectStageTemplates.find(
      (t) => t.id === templateId,
    );
    if (!template || !template.projectStages) {
      throw new NotFoundException('Project stage template not found');
    }

    try {
      // Create stages from template using transaction for consistency
      const createdStages = await this.prisma.$transaction(async (prisma) => {
        const stages = [];

        for (const stageTemplate of template.projectStages) {
          const stage = await prisma.projectStage.create({
            data: {
              name: stageTemplate.name,
              description: stageTemplate.description,
              color: stageTemplate.color,
              order: stageTemplate.order,
              workspaceId: workspaceId,
            },
          });
          stages.push(stage);
        }

        return stages;
      });

      return createdStages;
    } catch (error) {
      console.error('Error applying project stage template:', error);
      throw new BadRequestException('Failed to apply project stage template');
    }
  }

  // Get suggested template based on project or workspace context
  async getSuggestedTaskStageTemplate(
    projectId: string,
  ): Promise<StageTemplate | null> {
    // Logic to suggest template based on project name, description, or team preferences
    // For now, return the simple kanban as default
    return (
      this.taskStageTemplates.find((t) => t.id === 'simple-kanban') || null
    );
  }

  async getSuggestedProjectStageTemplate(
    workspaceId: string,
  ): Promise<StageTemplate | null> {
    // Logic to suggest template based on workspace context
    // For now, return the basic project flow as default
    return (
      this.projectStageTemplates.find((t) => t.id === 'basic-project-flow') ||
      null
    );
  }

  // ============ CRM LEAD STAGE TEMPLATES ============

  // Get all available lead stage templates
  getLeadStageTemplates(): StageTemplate[] {
    return this.leadStageTemplates;
  }

  // Get lead stage templates by category
  getLeadStageTemplatesByCategory(category: string): StageTemplate[] {
    return this.leadStageTemplates.filter(
      (template) => template.category === category,
    );
  }

  // Apply lead stage template to a workspace
  async applyLeadStageTemplate(
    workspaceId: string,
    templateId: string,
  ): Promise<any[]> {
    // Verify workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if workspace already has lead stages
    const existingStages = await this.prisma.leadStage.findMany({
      where: {
        workspaceId,
        isDeleted: false,
      },
    });

    if (existingStages.length > 0) {
      throw new BadRequestException(
        'Workspace already has lead stages. Please delete existing stages first.',
      );
    }

    // Find template
    const template = this.leadStageTemplates.find((t) => t.id === templateId);
    if (!template || !template.leadStages) {
      throw new NotFoundException('Lead stage template not found');
    }

    try {
      // Create stages from template using transaction for consistency
      const createdStages = await this.prisma.$transaction(async (prisma) => {
        const stages = [];

        for (const stageTemplate of template.leadStages) {
          const stage = await prisma.leadStage.create({
            data: {
              name: stageTemplate.name,
              description: stageTemplate.description,
              color: stageTemplate.color,
              order: stageTemplate.order,
              workspaceId: workspaceId,
            },
          });
          stages.push(stage);
        }

        return stages;
      });

      return createdStages;
    } catch (error) {
      console.error('Error applying lead stage template:', error);
      throw new BadRequestException('Failed to apply lead stage template');
    }
  }

  // Get suggested lead stage template based on workspace context
  async getSuggestedLeadStageTemplate(
    workspaceId: string,
  ): Promise<StageTemplate | null> {
    // Logic to suggest template based on workspace context
    // For now, return the simple sales funnel as default
    return (
      this.leadStageTemplates.find((t) => t.id === 'simple-sales-funnel') ||
      null
    );
  }
}
