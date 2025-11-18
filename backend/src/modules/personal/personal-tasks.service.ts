import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePersonalTaskDto } from './dto/create-personal-task.dto';
import { UpdatePersonalTaskDto } from './dto/update-personal-task.dto';

@Injectable()
export class PersonalTasksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPersonalTaskDto: CreatePersonalTaskDto) {
    return this.prisma.personalTask.create({
      data: {
        ...createPersonalTaskDto,
        userId,
      },
    });
  }

  async findAll(userId: string, filters?: { completed?: boolean; priority?: string; dueDate?: string }) {
    const whereClause: any = {
      userId,
    };

    if (filters?.completed !== undefined) {
      whereClause.completed = filters.completed;
    }
    if (filters?.priority) {
      whereClause.priority = filters.priority;
    }
    if (filters?.dueDate) {
      whereClause.dueDate = {
        gte: new Date(`${filters.dueDate}T00:00:00.000Z`),
        lt: new Date(`${filters.dueDate}T23:59:59.999Z`),
      };
    }

    return this.prisma.personalTask.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.personalTask.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async update(id: string, updatePersonalTaskDto: UpdatePersonalTaskDto, userId: string) {
    // Check if the task belongs to the user
    const task = await this.prisma.personalTask.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!task) {
      throw new Error('Task not found or insufficient permissions');
    }

    return this.prisma.personalTask.update({
      where: { id },
      data: updatePersonalTaskDto,
    });
  }

  async remove(id: string, userId: string) {
    // Check if the task belongs to the user
    const task = await this.prisma.personalTask.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!task) {
      throw new Error('Task not found or insufficient permissions');
    }

    return this.prisma.personalTask.delete({
      where: { id },
    });
  }

  async toggleCompletion(id: string, userId: string) {
    // Check if the task belongs to the user
    const task = await this.prisma.personalTask.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!task) {
      throw new Error('Task not found or insufficient permissions');
    }

    return this.prisma.personalTask.update({
      where: { id },
      data: {
        completed: !task.completed,
        completedAt: !task.completed ? new Date() : null,
      },
    });
  }

  async getTodayTasks(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.personalTask.findMany({
      where: {
        userId,
        OR: [
          {
            dueDate: {
              gte: today,
              lt: tomorrow,
            },
          },
          {
            recurrencePattern: {
              not: 'NONE',
            },
          },
          {
            completed: false,
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWeekTasks(userId: string) {
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.prisma.personalTask.findMany({
      where: {
        userId,
        OR: [
          {
            dueDate: {
              gte: weekStart,
              lt: weekEnd,
            },
          },
          {
            recurrencePattern: {
              not: 'NONE',
            },
          },
          {
            completed: false,
          },
        ],
      },
      orderBy: { dueDate: 'asc', createdAt: 'desc' },
    });
  }
}