import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createWorkspaceDto: any, @Param('userId') userId: string) {
    return this.workspacesService.create({ ...createWorkspaceDto, ownerId: userId });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Param('userId') userId: string) {
    return this.workspacesService.findAll(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.workspacesService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: any,
    @Param('userId') userId: string
  ) {
    return this.workspacesService.update(id, updateWorkspaceDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.workspacesService.remove(id, userId);
  }
}