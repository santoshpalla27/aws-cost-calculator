import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createJournalEntryDto: CreateJournalEntryDto) {
    return this.prisma.journalEntry.create({
      data: {
        ...createJournalEntryDto,
        userId,
      },
    });
  }

  async findAll(userId: string, filters?: { startDate?: string; endDate?: string; mood?: string; tags?: string[] }) {
    const whereClause: any = {
      userId,
    };

    if (filters?.startDate || filters?.endDate) {
      whereClause.entryDate = {};
      if (filters.startDate) {
        whereClause.entryDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.entryDate.lte = new Date(filters.endDate);
      }
    }

    if (filters?.mood) {
      whereClause.mood = filters.mood;
    }

    // Note: Filtering by tags would require a more complex query depending on how tags are stored
    // This implementation assumes tags are stored as a JSON array

    return this.prisma.journalEntry.findMany({
      where: whereClause,
      orderBy: { entryDate: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.journalEntry.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async update(id: string, updateJournalEntryDto: UpdateJournalEntryDto, userId: string) {
    // Check if the entry belongs to the user
    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!entry) {
      throw new Error('Journal entry not found or insufficient permissions');
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: updateJournalEntryDto,
    });
  }

  async remove(id: string, userId: string) {
    // Check if the entry belongs to the user
    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!entry) {
      throw new Error('Journal entry not found or insufficient permissions');
    }

    return this.prisma.journalEntry.delete({
      where: { id },
    });
  }

  async getRecentEntries(userId: string, count: number = 5) {
    return this.prisma.journalEntry.findMany({
      where: {
        userId,
      },
      orderBy: { entryDate: 'desc' },
      take: count,
    });
  }

  async getEntriesForDateRange(userId: string, startDate: string, endDate: string) {
    return this.prisma.journalEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { entryDate: 'asc' },
    });
  }
}