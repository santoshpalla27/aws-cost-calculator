import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getProjectVelocity(projectId: string, userId: string, sprints: number = 6) {
    // Verify user has access to the project
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { workspace: { members: { some: { userId } } } },
          { ownerId: userId }
        ]
      }
    });

    if (!project) {
      throw new Error('Project not found or insufficient permissions');
    }

    // Get tasks completed in the last sprints worth of time
    // For demo purposes, we'll calculate velocity based on tasks completed in the last 6 weeks
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - (sprints * 7));

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        completedAt: {
          gte: sixWeeksAgo,
        },
      },
      select: {
        storyPoints: true,
        completedAt: true,
      },
    });

    // Group tasks by week and calculate completed story points
    const weeks = Array.from({ length: sprints }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      return {
        name: `Week ${sprints - i}`,
        start: new Date(date),
        end: new Date(date),
        completed: 0,
        planned: 0, // For now, we'll just use completed as planned
      };
    });

    // Adjust end date of first week to today
    weeks[0].end = new Date();

    // Calculate completed story points per week
    tasks.forEach(task => {
      if (task.completedAt && task.storyPoints) {
        const weekIndex = weeks.findIndex(week => 
          task.completedAt && 
          task.completedAt >= week.start && 
          task.completedAt <= week.end
        );
        
        if (weekIndex !== -1) {
          weeks[weekIndex].completed += task.storyPoints;
        }
      }
    });

    // Calculate average velocity
    const totalCompleted = weeks.reduce((sum, week) => sum + week.completed, 0);
    const averageVelocity = weeks.length > 0 ? totalCompleted / weeks.length : 0;

    return {
      averageVelocity,
      sprints: weeks.map(week => ({
        name: week.name,
        completed: week.completed,
        planned: week.planned,
      })),
    };
  }

  async getProjectBurndown(projectId: string, userId: string) {
    // Verify user has access to the project
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { workspace: { members: { some: { userId } } } },
          { ownerId: userId }
        ]
      }
    });

    if (!project) {
      throw new Error('Project not found or insufficient permissions');
    }

    // For a burndown chart, we need to calculate:
    // 1. Total planned work
    // 2. Remaining work over time

    const allTasks = await this.prisma.task.findMany({
      where: { projectId },
      select: {
        storyPoints: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // Calculate total planned story points
    const totalPlanned = allTasks.reduce((sum, task) => 
      sum + (task.storyPoints || 0), 0);

    // Calculate remaining points over time
    const startDate = project.startDate || new Date();
    const endDate = project.endDate || new Date();
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const burndownData = [];
    for (let i = 0; i <= days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const remainingPoints = allTasks
        .filter(task => {
          // If task was completed before currentDate, it doesn't count toward remaining
          // If task was created after currentDate, it doesn't count
          return (
            task.createdAt <= currentDate &&
            (task.status === 'DONE' ? (task.completedAt && task.completedAt > currentDate) : true)
          );
        })
        .reduce((sum, task) => sum + (task.storyPoints || 0), 0);

      burndownData.push({
        date: currentDate.toISOString().split('T')[0],
        remaining: remainingPoints,
      });
    }

    return {
      idealLine: [
        { date: startDate.toISOString().split('T')[0], remaining: totalPlanned },
        { date: endDate.toISOString().split('T')[0], remaining: 0 },
      ],
      actualLine: burndownData,
      totalPlanned,
    };
  }

  async getTaskDistribution(projectId: string, userId: string, groupBy: 'status' | 'assignee' = 'status') {
    // Verify user has access to the project
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { workspace: { members: { some: { userId } } } },
          { ownerId: userId }
        ]
      }
    });

    if (!project) {
      throw new Error('Project not found or insufficient permissions');
    }

    if (groupBy === 'status') {
      const tasks = await this.prisma.task.groupBy({
        by: ['status'],
        where: { projectId },
        _count: true,
      });

      return tasks.map(task => ({
        name: task.status,
        count: task._count,
      }));
    } else {
      // Group by assignee
      const tasks = await this.prisma.task.findMany({
        where: { projectId },
        include: {
          assignee: {
            select: {
              id: true,
              fullName: true,
            }
          }
        }
      });

      const distribution = {};
      tasks.forEach(task => {
        const assigneeName = task.assignee?.fullName || 'Unassigned';
        distribution[assigneeName] = (distribution[assigneeName] || 0) + 1;
      });

      return Object.entries(distribution).map(([name, count]) => ({
        name,
        count: count as number,
      }));
    }
  }

  async getUserProductivity(userId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get user's tasks
    const tasks = await this.prisma.task.findMany({
      where: {
        OR: [
          { assigneeId: userId },
          { reporterId: userId },
        ],
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Get completed tasks
    const completedTasks = tasks.filter(task => task.status === 'DONE');

    // Get logged time
    const timeLogs = await this.prisma.timeLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const totalLoggedMinutes = timeLogs.reduce((sum, log) => sum + log.durationMinutes, 0);

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      completionRate: tasks.length ? (completedTasks.length / tasks.length) * 100 : 0,
      totalLoggedHours: totalLoggedMinutes / 60,
      tasksPerDay: tasks.length / (end.getDate() - start.getDate() + 1),
    };
  }

  async getWorkspaceOverview(workspaceId: string, userId: string) {
    // Verify user has access to the workspace
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { members: { some: { userId } } },
          { ownerId: userId }
        ]
      }
    });

    if (!workspace) {
      throw new Error('Workspace not found or insufficient permissions');
    }

    // Get all projects in the workspace
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
    });

    // Get all tasks in the workspace
    const tasks = await this.prisma.task.findMany({
      where: {
        projectId: { in: projects.map(p => p.id) }
      },
    });

    // Calculate various metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const notStartedTasks = tasks.filter(t => t.status === 'TODO').length;

    const overview = {
      totalProjects: projects.length,
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      completionRate: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
      activeUsers: await this.prisma.workspaceMember.count({
        where: { workspaceId }
      }),
      projectStatuses: projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {}),
    };

    return overview;
  }
}