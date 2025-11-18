import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';

@Injectable()
export class EpicsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createEpicDto: CreateEpicDto) {
    // Verify user has access to the project
    const project = await this.prisma.project.findFirst({
      where: {
        id: createEpicDto.projectId,
        OR: [
          { workspace: { members: { some: { userId } } } },
          { ownerId: userId }
        ]
      }
    });

    if (!project) {
      throw new Error('Project not found or insufficient permissions');
    }

    // Get the next sequence number for this project
    const lastEpic = await this.prisma.epic.findFirst({
      where: { projectId: createEpicDto.projectId },
      orderBy: { sequenceNumber: 'desc' },
    });

    const sequenceNumber = lastEpic ? lastEpic.sequenceNumber + 1 : 1;

    return this.prisma.epic.create({
      data: {
        ...createEpicDto,
        sequenceNumber,
        project: {
          connect: { id: createEpicDto.projectId }
        },
        ...(createEpicDto.assigneeId && {
          assignee: { connect: { id: createEpicDto.assigneeId } }
        }),
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
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          }
        }
      }
    });
  }

  async findAll(userId: string, projectId: string) {
    return this.prisma.epic.findMany({
      where: {
        projectId,
        OR: [
          { project: { workspace: { members: { some: { userId } } } } },
          { project: { ownerId: userId } }
        ]
      },
      include: {
        project: { select: { name: true } },
        assignee: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
          take: 5 // Limit tasks in list view
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.epic.findFirst({
      where: {
        id,
        OR: [
          { project: { workspace: { members: { some: { userId } } } } },
          { project: { ownerId: userId } }
        ]
      },
      include: {
        project: { select: { name: true } },
        assignee: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              }
            },
            labels: {
              include: {
                label: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async update(id: string, updateEpicDto: UpdateEpicDto, userId: string) {
    // Check if user has permission to update the epic
    const epic = await this.prisma.epic.findFirst({
      where: {
        id,
        OR: [
          { project: { workspace: { members: { some: { userId, role: { in: ['ADMIN', 'OWNER'] } } } } } },
          { project: { ownerId: userId } }
        ]
      }
    });

    if (!epic) {
      throw new Error('Epic not found or insufficient permissions');
    }

    return this.prisma.epic.update({
      where: { id },
      data: {
        ...updateEpicDto,
        ...(updateEpicDto.assigneeId && {
          assignee: { connect: { id: updateEpicDto.assigneeId } }
        })
      },
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        }
      }
    });
  }

  async remove(id: string, userId: string) {
    // Check if user has permission to delete the epic
    const epic = await this.prisma.epic.findFirst({
      where: {
        id,
        project: { ownerId: userId }
      }
    });

    if (!epic) {
      throw new Error('Epic not found or insufficient permissions');
    }

    return this.prisma.epic.delete({
      where: { id }
    });
  }
}