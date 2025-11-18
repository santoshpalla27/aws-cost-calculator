import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EpicsService } from './epics.service';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('projects/:projectId/epics')
export class EpicsController {
  constructor(private readonly epicsService: EpicsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() createEpicDto: CreateEpicDto,
    @Param('userId') userId: string
  ) {
    return this.epicsService.create(userId, { ...createEpicDto, projectId });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string
  ) {
    return this.epicsService.findAll(userId, projectId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Param('userId') userId: string
  ) {
    return this.epicsService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEpicDto: UpdateEpicDto,
    @Param('userId') userId: string
  ) {
    return this.epicsService.update(id, updateEpicDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Param('userId') userId: string
  ) {
    return this.epicsService.remove(id, userId);
  }
}