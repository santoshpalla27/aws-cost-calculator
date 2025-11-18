import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Param('userId') userId: string) {
    return this.tasksService.create(userId, createTaskDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(
    @Param('userId') userId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string
  ) {
    return this.tasksService.findAll(userId, { projectId, status, assigneeId });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.tasksService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Param('userId') userId: string) {
    return this.tasksService.update(id, updateTaskDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.tasksService.remove(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':taskId/comments')
  addComment(
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
    @Body('content') content: string
  ) {
    return this.tasksService.addComment(taskId, userId, content);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':taskId/time-logs')
  logTime(
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
    @Body('durationMinutes') durationMinutes: number,
    @Body('description') description?: string
  ) {
    return this.tasksService.logTime(taskId, userId, durationMinutes, description);
  }
}