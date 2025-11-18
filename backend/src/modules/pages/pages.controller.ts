import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createPageDto: CreatePageDto, @Param('userId') userId: string) {
    return this.pagesService.create(userId, createPageDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(
    @Param('userId') userId: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('parentPageId') parentPageId?: string,
    @Query('archived') archived?: string,
  ) {
    return this.pagesService.findAll(userId, {
      workspaceId,
      parentPageId,
      archived: archived ? archived === 'true' : undefined,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.pagesService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePageDto: UpdatePageDto, @Param('userId') userId: string) {
    return this.pagesService.update(id, updatePageDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.pagesService.remove(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/duplicate')
  duplicate(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('newTitle') newTitle?: string,
  ) {
    return this.pagesService.duplicate(id, userId, newTitle);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/restore')
  restore(@Param('id') id: string, @Param('userId') userId: string) {
    return this.pagesService.restore(id, userId);
  }
}