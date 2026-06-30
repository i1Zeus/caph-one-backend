import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(workspaceId?: string) {
    try {
      // Build project filter for workspace
      const projectWhereClause = workspaceId
        ? { workspaceId, isDeleted: false }
        : { isDeleted: false };

      // Build task filter (tasks belong to projects, which belong to workspaces)
      const taskWhereClause = workspaceId
        ? { project: { workspaceId }, isDeleted: false }
        : { isDeleted: false };

      // Execute queries in smaller batches to reduce connection pool pressure
      // Batch 1: Basic counts
      const [totalUsers, totalProjects, totalTasks, totalComments] =
        await Promise.all([
          this.prisma.user.count({ where: { isDeleted: false } }),
          this.prisma.project.count({ where: projectWhereClause }),
          this.prisma.task.count({ where: taskWhereClause }),
          this.prisma.comment.count({
            where: workspaceId
              ? { task: { project: { workspaceId } }, isDeleted: false }
              : { isDeleted: false },
          }),
        ]);

      // Batch 2: Group by queries
      const [
        taskStatusBreakdown,
        taskPriorityBreakdown,
        userRoleDistribution,
        projectStageBreakdown,
      ] = await Promise.all([
        this.prisma.task.groupBy({
          by: ['status'],
          where: taskWhereClause,
          _count: { id: true },
        }),
        this.prisma.task.groupBy({
          by: ['priority'],
          where: taskWhereClause,
          _count: { id: true },
        }),
        // Get role distribution using the new userRoles relation
        this.prisma.role.findMany({
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                userRoles: {
                  where: {
                    user: { isDeleted: false },
                    isDeleted: false,
                  },
                },
              },
            },
          },
        }),
        this.prisma.project.groupBy({
          by: ['projectStageId'],
          where: projectWhereClause,
          _count: { id: true },
        }),
      ]);

      // Batch 3: Time-based queries and remaining data
      const [
        recentLoginEvents,
        recentActiveTasks,
        monthlyTaskCompletion,
        totalTransactions,
        recentActionHistory,
      ] = await Promise.all([
        this.prisma.loginEvent.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        this.prisma.task.count({
          where: {
            ...taskWhereClause,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        this.prisma.task.count({
          where: {
            ...(workspaceId ? { project: { workspaceId } } : {}),
            status: 'COMPLETED',
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        this.prisma.transaction.count({ where: { isDeleted: false } }),
        this.prisma.actionHistory.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { name: true },
            },
          },
        }),
      ]);

      return {
        overview: {
          totalUsers,
          totalProjects,
          totalTasks,
          totalComments,
          totalTransactions,
          recentLoginEvents,
          recentActiveTasks,
          monthlyTaskCompletion,
        },
        taskStatistics: {
          statusBreakdown: taskStatusBreakdown.map((item) => ({
            status: item.status,
            count: item._count.id,
          })),
          priorityBreakdown: taskPriorityBreakdown.map((item) => ({
            priority: item.priority,
            count: item._count.id,
          })),
        },
        userStatistics: {
          roleDistribution: userRoleDistribution.map((item) => ({
            role: item.name,
            count: item._count.userRoles,
          })),
        },
        projectStatistics: {
          stageBreakdown: projectStageBreakdown.map((item) => ({
            stageId: item.projectStageId,
            count: item._count.id,
          })),
        },
        recentActivity: recentActionHistory,
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      // Return a default response if database queries fail
      throw new Error(
        'Failed to fetch dashboard statistics. Please try again later.',
      );
    }
  }

  async getTaskAnalytics(workspaceId?: string) {
    // Build task filter for workspace
    const taskWhereClause = workspaceId
      ? { project: { workspaceId }, isDeleted: false }
      : { isDeleted: false };

    const [
      completionRate,
      averageTasksPerUser,
      highPriorityTasks,
      overdueTasks,
      tasksByProject,
    ] = await Promise.all([
      // Task completion rate
      this.prisma.task
        .aggregate({
          where: taskWhereClause,
          _count: { id: true },
        })
        .then(async (total) => {
          const completed = await this.prisma.task.count({
            where: {
              ...taskWhereClause,
              status: 'COMPLETED',
            },
          });
          return {
            total: total._count.id,
            completed,
            rate: total._count.id > 0 ? (completed / total._count.id) * 100 : 0,
          };
        }),

      // Average tasks per user
      this.prisma.user
        .count({ where: { isDeleted: false } })
        .then(async (userCount) => {
          const taskCount = await this.prisma.task.count({
            where: taskWhereClause,
          });
          return userCount > 0 ? taskCount / userCount : 0;
        }),

      // High priority tasks
      this.prisma.task.count({
        where: {
          ...taskWhereClause,
          priority: { in: ['HIGH', 'CRITICAL'] },
        },
      }),

      // Tasks that might be overdue (pending for more than 7 days)
      this.prisma.task.count({
        where: {
          ...taskWhereClause,
          status: 'PENDING',
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Tasks grouped by project (filtered by workspace)
      this.prisma.task.groupBy({
        by: ['projectId'],
        where: taskWhereClause,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      completionRate,
      averageTasksPerUser,
      highPriorityTasks,
      overdueTasks,
      tasksByProject: tasksByProject.map((item) => ({
        projectId: item.projectId,
        count: item._count.id,
      })),
    };
  }

  async getUserAnalytics() {
    const [activeUsers, recentSignups, usersByRole, topContributors] =
      await Promise.all([
        // Users who logged in within last 7 days
        this.prisma.loginEvent.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          _count: { userId: true },
        }),

        // New users in last 30 days
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
            isDeleted: false,
          },
        }),

        // Users by role using the new userRoles relation
        this.prisma.role.findMany({
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                userRoles: {
                  where: {
                    user: { isDeleted: false },
                    isDeleted: false,
                  },
                },
              },
            },
          },
        }),

        // Top contributors (users with most tasks assigned) - fixed approach
        this.prisma.user.findMany({
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                assignedTasks: {
                  where: {
                    status: 'COMPLETED',
                    isDeleted: false,
                  },
                },
              },
            },
          },
          orderBy: {
            assignedTasks: {
              _count: 'desc',
            },
          },
          take: 5,
        }),
      ]);

    return {
      activeUsers: activeUsers.length,
      recentSignups,
      usersByRole: usersByRole.map((item) => ({
        role: item.name,
        count: item._count.userRoles,
      })),
      topContributors: topContributors.map((user) => ({
        id: user.id,
        name: user.name,
        completedTasks: user._count.assignedTasks,
      })),
    };
  }
}
