import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async create(createWorkspaceDto: any) {
    return this.prisma.workspace.create({
      data: {
        ...createWorkspaceDto,
        owner: {
          connect: { id: createWorkspaceDto.ownerId }
        }
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        }
      }
    });
  }

  async findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        members: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.workspace.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        members: {
          include: {
            user: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });
  }

  async update(id: string, updateWorkspaceDto: any, userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!workspace) {
      throw new Error('Workspace not found or insufficient permissions');
    }

    return this.prisma.workspace.update({
      where: { id },
      data: updateWorkspaceDto
    });
  }

  async remove(id: string, userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!workspace) {
      throw new Error('Workspace not found or insufficient permissions');
    }

    return this.prisma.workspace.delete({
      where: { id }
    });
  }
}