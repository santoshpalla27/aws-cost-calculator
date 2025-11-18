import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';

@Injectable()
export class HabitsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createHabitDto: CreateHabitDto) {
    return this.prisma.habit.create({
      data: {
        ...createHabitDto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.habit.findMany({
      where: {
        userId,
      },
      include: {
        logs: {
          where: {
            logDate: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
            },
          },
          orderBy: {
            logDate: 'desc',
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.habit.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        logs: {
          orderBy: {
            logDate: 'desc',
          },
        },
      },
    });
  }

  async update(id: string, updateHabitDto: UpdateHabitDto, userId: string) {
    // Check if the habit belongs to the user
    const habit = await this.prisma.habit.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!habit) {
      throw new Error('Habit not found or insufficient permissions');
    }

    return this.prisma.habit.update({
      where: { id },
      data: updateHabitDto,
    });
  }

  async remove(id: string, userId: string) {
    // Check if the habit belongs to the user
    const habit = await this.prisma.habit.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!habit) {
      throw new Error('Habit not found or insufficient permissions');
    }

    return this.prisma.habit.delete({
      where: { id },
    });
  }

  async logHabitCompletion(habitId: string, userId: string, date?: string, notes?: string) {
    // Check if the habit belongs to the user
    const habit = await this.prisma.habit.findFirst({
      where: {
        id: habitId,
        userId,
      },
    });

    if (!habit) {
      throw new Error('Habit not found or insufficient permissions');
    }

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    // Check if there's already a log for this date
    let habitLog = await this.prisma.habitLog.findFirst({
      where: {
        habitId,
        logDate,
      },
    });

    if (habitLog) {
      // Update existing log
      habitLog = await this.prisma.habitLog.update({
        where: { id: habitLog.id },
        data: {
          completed: !habitLog.completed,
          notes,
        },
      });
    } else {
      // Create new log
      habitLog = await this.prisma.habitLog.create({
        data: {
          habitId,
          logDate,
          completed: true,
          notes,
        },
      });
    }

    // Update streak count
    await this.updateStreak(habitId, userId);

    return habitLog;
  }

  private async updateStreak(habitId: string, userId: string) {
    // Get all logs for this habit in descending order by date
    const logs = await this.prisma.habitLog.findMany({
      where: {
        habitId,
      },
      orderBy: {
        logDate: 'desc',
      },
    });

    if (logs.length === 0) return;

    // Calculate the current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if habit was completed today
    const todayLog = logs.find(log => 
      new Date(log.logDate).getTime() === today.getTime()
    );
    
    if (todayLog && todayLog.completed) {
      currentStreak = 1;
    }

    // Count consecutive completed days backwards from today (or yesterday if today wasn't completed)
    let currentDate = new Date(today);
    if (!todayLog || !todayLog.completed) {
      currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday
    }

    for (const log of logs) {
      const logDate = new Date(log.logDate);
      logDate.setHours(0, 0, 0, 0);

      if (logDate.getTime() === currentDate.getTime()) {
        if (log.completed) {
          currentStreak++;
        } else {
          break; // Streak broken
        }
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (logDate.getTime() < currentDate.getTime()) {
        // Skip days - if there are unlogged days, streak is broken
        break;
      }
    }

    // Update the habit with the new streak count
    await this.prisma.habit.update({
      where: { id: habitId },
      data: { streakCount: currentStreak },
    });
  }

  async getHabitLogs(habitId: string, userId: string, startDate?: string, endDate?: string) {
    // Check if the habit belongs to the user
    const habit = await this.prisma.habit.findFirst({
      where: {
        id: habitId,
        userId,
      },
    });

    if (!habit) {
      throw new Error('Habit not found or insufficient permissions');
    }

    const whereClause: any = {
      habitId,
    };

    if (startDate && endDate) {
      whereClause.logDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereClause.logDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.logDate = {
        lte: new Date(endDate),
      };
    }

    return this.prisma.habitLog.findMany({
      where: whereClause,
      orderBy: {
        logDate: 'asc',
      },
    });
  }
}