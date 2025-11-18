import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPageDto: CreatePageDto) {
    // If workspaceId is provided, verify user has access to the workspace
    if (createPageDto.workspaceId) {
      const workspace = await this.prisma.workspace.findFirst({
        where: {
          id: createPageDto.workspaceId,
          OR: [
            { members: { some: { userId } } },
            { ownerId: userId }
          ]
        }
      });

      if (!workspace) {
        throw new Error('Workspace not found or insufficient permissions');
      }
    }

    return this.prisma.page.create({
      data: {
        ...createPageDto,
        userId,
        ...(createPageDto.workspaceId && {
          workspace: { connect: { id: createPageDto.workspaceId } }
        }),
        ...(createPageDto.parentPageId && {
          parentPage: { connect: { id: createPageDto.parentPageId } }
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        },
        workspace: true,
        parentPage: true,
        blocks: {
          orderBy: { position: 'asc' }
        }
      }
    });
  }

  async findAll(userId: string, filters?: { workspaceId?: string; parentPageId?: string; archived?: boolean }) {
    const whereClause: any = {
      OR: [
        { userId },
        { workspace: { members: { some: { userId } } } }
      ]
    };

    if (filters?.workspaceId) {
      whereClause.workspaceId = filters.workspaceId;
    }
    if (filters?.parentPageId) {
      whereClause.parentPageId = filters.parentPageId;
    }
    if (filters?.archived !== undefined) {
      if (filters.archived) {
        whereClause.archivedAt = { not: null };
      } else {
        whereClause.archivedAt = null;
      }
    } else {
      // By default, don't return archived pages
      whereClause.archivedAt = null;
    }

    return this.prisma.page.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          }
        },
        workspace: {
          select: {
            id: true,
            name: true,
          }
        },
        blocks: {
          select: {
            id: true,
            blockType: true,
            content: true,
            position: true,
          },
          take: 5, // Limit blocks in list view
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.page.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { workspace: { members: { some: { userId } } } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        },
        workspace: true,
        parentPage: {
          select: {
            id: true,
            title: true,
          }
        },
        childPages: {
          select: {
            id: true,
            title: true,
            position: true,
          },
          orderBy: { position: 'asc' }
        },
        blocks: {
          orderBy: { position: 'asc' }
        }
      }
    });
  }

  async update(id: string, updatePageDto: UpdatePageDto, userId: string) {
    // Check if user has permission to update the page
    const page = await this.prisma.page.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { workspace: { members: { some: { userId, role: { in: ['ADMIN', 'OWNER'] } } } } }
        ]
      }
    });

    if (!page) {
      throw new Error('Page not found or insufficient permissions');
    }

    return this.prisma.page.update({
      where: { id },
      data: updatePageDto,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          }
        },
        workspace: true,
      }
    });
  }

  async remove(id: string, userId: string) {
    // Check if user has permission to delete the page
    const page = await this.prisma.page.findFirst({
      where: {
        id,
        userId,
      }
    });

    if (!page) {
      throw new Error('Page not found or insufficient permissions');
    }

    // Instead of deleting, archive the page
    return this.prisma.page.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async restore(id: string, userId: string) {
    // Check if user has permission to restore the page
    const page = await this.prisma.page.findFirst({
      where: {
        id,
        userId,
        archivedAt: { not: null }
      }
    });

    if (!page) {
      throw new Error('Archived page not found or insufficient permissions');
    }

    return this.prisma.page.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async duplicate(id: string, userId: string, newTitle?: string) {
    // Find the original page
    const originalPage = await this.prisma.page.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { workspace: { members: { some: { userId } } } }
        ]
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!originalPage) {
      throw new Error('Page not found or insufficient permissions');
    }

    // Create a new page with the same content
    const newPage = await this.prisma.page.create({
      data: {
        title: newTitle || `${originalPage.title} (Copy)`,
        icon: originalPage.icon,
        userId,
        workspaceId: originalPage.workspaceId,
        parentPageId: originalPage.parentPageId,
        position: originalPage.position,
        isPublic: originalPage.isPublic,
      }
    });

    // Duplicate the blocks
    if (originalPage.blocks.length > 0) {
      const blocksData = originalPage.blocks.map((block, index) => ({
        pageId: newPage.id,
        blockType: block.blockType,
        content: block.content,
        properties: block.properties,
        position: index,
        parentBlockId: block.parentBlockId,
      }));

      await this.prisma.pageBlock.createMany({
        data: blocksData,
      });
    }

    return this.findOne(newPage.id, userId);
  }
}