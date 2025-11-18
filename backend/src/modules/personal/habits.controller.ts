import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('personal/habits')
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createHabitDto: CreateHabitDto, @Param('userId') userId: string) {
    return this.habitsService.create(userId, createHabitDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Param('userId') userId: string) {
    return this.habitsService.findAll(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.habitsService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHabitDto: UpdateHabitDto, @Param('userId') userId: string) {
    return this.habitsService.update(id, updateHabitDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.habitsService.remove(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':habitId/log')
  logHabitCompletion(
    @Param('habitId') habitId: string,
    @Param('userId') userId: string,
    @Body('date') date?: string,
    @Body('notes') notes?: string,
  ) {
    return this.habitsService.logHabitCompletion(habitId, userId, date, notes);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':habitId/logs')
  getHabitLogs(
    @Param('habitId') habitId: string,
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.habitsService.getHabitLogs(habitId, userId, startDate, endDate);
  }
}