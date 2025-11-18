import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('projects/:projectId/velocity')
  getProjectVelocity(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Query('sprints') sprints: string,
  ) {
    return this.analyticsService.getProjectVelocity(
      projectId, 
      userId, 
      parseInt(sprints, 10) || 6
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('projects/:projectId/burndown')
  getProjectBurndown(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.analyticsService.getProjectBurndown(projectId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('projects/:projectId/task-distribution')
  getTaskDistribution(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Query('groupBy') groupBy: string,
  ) {
    const validGroupBy = ['status', 'assignee'].includes(groupBy) ? groupBy as 'status' | 'assignee' : 'status';
    return this.analyticsService.getTaskDistribution(projectId, userId, validGroupBy);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users/:userId/productivity')
  getUserProductivity(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getUserProductivity(userId, startDate, endDate);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('workspace/:workspaceId/overview')
  getWorkspaceOverview(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.analyticsService.getWorkspaceOverview(workspaceId, userId);
  }
}