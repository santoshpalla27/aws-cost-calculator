import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PersonalTasksService } from './personal-tasks.service';
import { CreatePersonalTaskDto } from './dto/create-personal-task.dto';
import { UpdatePersonalTaskDto } from './dto/update-personal-task.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('personal/tasks')
export class PersonalTasksController {
  constructor(private readonly personalTasksService: PersonalTasksService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createPersonalTaskDto: CreatePersonalTaskDto, @Param('userId') userId: string) {
    return this.personalTasksService.create(userId, createPersonalTaskDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(
    @Param('userId') userId: string,
    @Query('completed') completed?: string,
    @Query('priority') priority?: string,
    @Query('dueDate') dueDate?: string,
  ) {
    return this.personalTasksService.findAll(userId, {
      completed: completed ? completed === 'true' : undefined,
      priority,
      dueDate,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.personalTasksService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePersonalTaskDto: UpdatePersonalTaskDto, @Param('userId') userId: string) {
    return this.personalTasksService.update(id, updatePersonalTaskDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.personalTasksService.remove(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/toggle-completion')
  toggleCompletion(@Param('id') id: string, @Param('userId') userId: string) {
    return this.personalTasksService.toggleCompletion(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('today')
  getTodayTasks(@Param('userId') userId: string) {
    return this.personalTasksService.getTodayTasks(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('week')
  getWeekTasks(@Param('userId') userId: string) {
    return this.personalTasksService.getWeekTasks(userId);
  }
}