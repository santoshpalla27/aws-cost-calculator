import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createTaskDto: CreateTaskDto) {
    // Verify user has access to the project
    const project = await this.prisma.project.findFirst({
      where: {
        id: createTaskDto.projectId,
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
    const lastTask = await this.prisma.task.findFirst({
      where: { projectId: createTaskDto.projectId },
      orderBy: { sequenceNumber: 'desc' },
    });

    const sequenceNumber = lastTask ? lastTask.sequenceNumber + 1 : 1;

    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        sequenceNumber,
        reporterId: userId,
        project: {
          connect: { id: createTaskDto.projectId }
        },
        ...(createTaskDto.assigneeId && {
          assignee: { connect: { id: createTaskDto.assigneeId } }
        }),
        ...(createTaskDto.epicId && {
          epic: { connect: { id: createTaskDto.epicId } }
        }),
      },
      include: {
        project: { select: { key: true } },
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        reporter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        comments: true,
        attachments: true,
        timeLogs: true,
        labels: {
          include: {
            label: true
          }
        }
      }
    });
  }

  async findAll(userId: string, filters?: { projectId?: string; status?: string; assigneeId?: string }) {
    const whereClause: any = {
      OR: [
        { project: { workspace: { members: { some: { userId } } } } },
        { project: { ownerId: userId } }
      ]
    };

    if (filters?.projectId) {
      whereClause.projectId = filters.projectId;
    }
    if (filters?.status) {
      whereClause.status = filters.status;
    }
    if (filters?.assigneeId) {
      whereClause.assigneeId = filters.assigneeId;
    }

    return this.prisma.task.findMany({
      where: whereClause,
      include: {
        project: { select: { key: true, name: true } },
        assignee: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        },
        reporter: {
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
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.task.findFirst({
      where: {
        id,
        OR: [
          { project: { workspace: { members: { some: { userId } } } } },
          { project: { ownerId: userId } }
        ]
      },
      include: {
        project: { select: { key: true, name: true } },
        epic: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        },
        reporter: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        timeLogs: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              }
            }
          }
        },
        labels: {
          include: {
            label: true
          }
        },
        dependencies: {
          include: {
            dependsOnTask: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    fullName: true,
                  }
                }
              }
            }
          }
        },
        dependents: {
          include: {
            task: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    fullName: true,
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    // Check if user has permission to update the task
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        OR: [
          { project: { workspace: { members: { some: { userId, role: { in: ['ADMIN', 'OWNER', 'MEMBER'] } } } } } },
          { project: { ownerId: userId } },
          { assigneeId: userId }
        ]
      }
    });

    if (!task) {
      throw new Error('Task not found or insufficient permissions');
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...updateTaskDto,
        ...(updateTaskDto.assigneeId && {
          assignee: { connect: { id: updateTaskDto.assigneeId } }
        })
      },
      include: {
        project: { select: { key: true } },
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        reporter: {
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
    // Check if user has permission to delete the task
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        project: { ownerId: userId }
      }
    });

    if (!task) {
      throw new Error('Task not found or insufficient permissions');
    }

    return this.prisma.task.delete({
      where: { id }
    });
  }

  async addComment(taskId: string, userId: string, content: string) {
    // Verify user has access to the task
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { project: { workspace: { members: { some: { userId } } } } },
          { project: { ownerId: userId } }
        ]
      }
    });

    if (!task) {
      throw new Error('Task not found or insufficient permissions');
    }

    return this.prisma.comment.create({
      data: {
        content,
        taskId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        }
      }
    });
  }

  async logTime(taskId: string, userId: string, durationMinutes: number, description?: string) {
    // Verify user has access to the task
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { project: { workspace: { members: { some: { userId } } } } },
          { project: { ownerId: userId } }
        ]
      }
    });

    if (!task) {
      throw new Error('Task not found or insufficient permissions');
    }

    return this.prisma.timeLog.create({
      data: {
        durationMinutes,
        description: description || '',
        taskId,
        userId,
        loggedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          }
        }
      }
    });
  }
}