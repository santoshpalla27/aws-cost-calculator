import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createIntegrationDto: CreateIntegrationDto, @Param('userId') userId: string) {
    return this.integrationsService.create(userId, createIntegrationDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(
    @Param('userId') userId: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('type') type?: string,
  ) {
    return this.integrationsService.findAll(userId, {
      workspaceId,
      type,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.integrationsService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIntegrationDto: UpdateIntegrationDto,
    @Param('userId') userId: string,
  ) {
    return this.integrationsService.update(id, updateIntegrationDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.integrationsService.remove(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/sync')
  triggerSync(@Param('id') id: string, @Param('userId') userId: string) {
    return this.integrationsService.triggerSync(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/test-connection')
  testConnection(@Param('id') id: string, @Param('userId') userId: string) {
    return this.integrationsService.testConnection(id, userId);
  }
}