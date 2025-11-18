import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';

@Injectable()
export class EpicsService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, createEpicDto: CreateEpicDto) {
    const lastEpic = await this.prisma.epic.findFirst({
      where: { projectId },
      orderBy: { sequenceNumber: 'desc' },
    });

    const sequenceNumber = (lastEpic?.sequenceNumber || 0) + 1;

    return this.prisma.epic.create({
      data: {
        projectId,
        ...createEpicDto,
        sequenceNumber,
      },
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        tasks: true,
      },
    });
  }

  async findAll(projectId: string) {
    return this.prisma.epic.findMany({
      where: { projectId },
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { sequenceNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const epic = await this.prisma.epic.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        tasks: true,
      },
    });

    if (!epic) {
      throw new NotFoundException(`Epic with ID ${id} not found`);
    }

    return epic;
  }

  async update(id: string, updateEpicDto: UpdateEpicDto) {
    return this.prisma.epic.update({
      where: { id },
      data: updateEpicDto,
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        tasks: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.epic.delete({
      where: { id },
    });
  }
}