import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { JournalService } from './journal.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('personal/journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createJournalEntryDto: CreateJournalEntryDto, @Param('userId') userId: string) {
    return this.journalService.create(userId, createJournalEntryDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('mood') mood?: string,
    @Query('tags') tags?: string,
  ) {
    return this.journalService.findAll(userId, {
      startDate,
      endDate,
      mood,
      tags: tags ? tags.split(',') : undefined,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.journalService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJournalEntryDto: UpdateJournalEntryDto, @Param('userId') userId: string) {
    return this.journalService.update(id, updateJournalEntryDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.journalService.remove(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('recent/:count')
  getRecentEntries(@Param('userId') userId: string, @Param('count') count: string) {
    return this.journalService.getRecentEntries(userId, parseInt(count) || 5);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('date-range')
  getEntriesForDateRange(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new Error('Both startDate and endDate are required');
    }
    return this.journalService.getEntriesForDateRange(userId, startDate, endDate);
  }
}