import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('pages/:pageId/blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Param('pageId') pageId: string,
    @Param('userId') userId: string,
    @Body() createBlockDto: CreateBlockDto,
  ) {
    return this.blocksService.create(pageId, userId, createBlockDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(
    @Param('pageId') pageId: string,
    @Param('userId') userId: string,
  ) {
    return this.blocksService.findAll(pageId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.blocksService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBlockDto: UpdateBlockDto,
    @Param('userId') userId: string,
  ) {
    return this.blocksService.update(id, updateBlockDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.blocksService.remove(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/move')
  move(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Query('position') position: string,
  ) {
    return this.blocksService.move(id, userId, parseInt(position, 10));
  }
}