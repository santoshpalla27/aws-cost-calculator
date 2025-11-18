import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @Param('userId') userId: string) {
    return this.projectsService.create(userId, createProjectDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Param('userId') userId: string) {
    return this.projectsService.findAll(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Param('userId') userId: string) {
    return this.projectsService.update(id, updateProjectDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.remove(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/board')
  getProjectBoard(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.getProjectBoard(id, userId);
  }
}