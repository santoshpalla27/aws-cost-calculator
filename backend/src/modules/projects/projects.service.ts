import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...createProjectDto,
        ownerId: userId,
        workspace: {
          connect: { id: createProjectDto.workspaceId }
        }
      },
      include: {
        projectSettings: true,
        epics: true,
        tasks: true,
        labels: true,
      }
    });
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: {
        OR: [
          { workspace: { members: { some: { userId } } } },
          { ownerId: userId }
        ]
      },
      include: {
        workspace: true,
        projectSettings: true,
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          }
        },
        epics: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.project.findFirst({
      where: {
        id,
        OR: [
          { workspace: { members: { some: { userId } } } },
          { ownerId: userId }
        ]
      },
      include: {
        workspace: true,
        projectSettings: true,
        epics: true,
        tasks: {
          include: {
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
        },
        labels: true,
      }
    });
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string) {
    // Check if user has permission to update the project
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          { workspace: { members: { some: { userId, role: { in: ['ADMIN', 'OWNER'] } } } } }
        ]
      }
    });

    if (!project) {
      throw new Error('Project not found or insufficient permissions');
    }

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        projectSettings: true,
        epics: true,
        tasks: true,
        labels: true,
      }
    });
  }

  async remove(id: string, userId: string) {
    // Check if user has permission to delete the project
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!project) {
      throw new Error('Project not found or insufficient permissions');
    }

    return this.prisma.project.update({
      where: { id },
      data: { 
        archivedAt: new Date() // Soft delete by setting archived date
      }
    });
  }

  async getProjectBoard(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        OR: [
          { workspace: { members: { some: { userId } } } },
          { ownerId: userId }
        ]
      },
      include: {
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
              select: {
                id: true,
                name: true,
                color: true,
              }
            }
          }
        }
      }
    });

    if (!project) {
      throw new Error('Project not found or insufficient permissions');
    }

    // Group tasks by status
    const columns = [
      { status: 'TODO', tasks: [] },
      { status: 'IN_PROGRESS', tasks: [] },
      { status: 'IN_REVIEW', tasks: [] },
      { status: 'BLOCKED', tasks: [] },
      { status: 'DONE', tasks: [] },
    ];

    project.tasks.forEach(task => {
      const column = columns.find(c => c.status === task.status);
      if (column) {
        column.tasks.push(task);
      }
    });

    return { columns, project: { id: project.id, name: project.name } };
  }
}