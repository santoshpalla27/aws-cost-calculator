import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';

@Injectable()
export class BlocksService {
  constructor(private prisma: PrismaService) {}

  async create(pageId: string, userId: string, createBlockDto: CreateBlockDto) {
    // Verify user has access to the page
    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        OR: [
          { userId },
          { workspace: { members: { some: { userId } } } }
        ]
      }
    });

    if (!page) {
      throw new Error('Page not found or insufficient permissions');
    }

    // Adjust positions of existing blocks that come after the new position
    await this.prisma.pageBlock.updateMany({
      where: {
        pageId,
        position: { gte: createBlockDto.position }
      },
      data: {
        position: { increment: 1 }
      }
    });

    return this.prisma.pageBlock.create({
      data: {
        ...createBlockDto,
        pageId,
        ...(createBlockDto.parentBlockId && {
          parentBlock: { connect: { id: createBlockDto.parentBlockId } }
        }),
      }
    });
  }

  async findAll(pageId: string, userId: string) {
    // Verify user has access to the page
    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        OR: [
          { userId },
          { workspace: { members: { some: { userId } } } }
        ]
      }
    });

    if (!page) {
      throw new Error('Page not found or insufficient permissions');
    }

    return this.prisma.pageBlock.findMany({
      where: { pageId },
      orderBy: { position: 'asc' }
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.pageBlock.findFirst({
      where: {
        id,
        page: {
          OR: [
            { userId },
            { workspace: { members: { some: { userId } } } }
          ]
        }
      }
    });
  }

  async update(id: string, updateBlockDto: UpdateBlockDto, userId: string) {
    // Check if user has permission to update the block
    const block = await this.prisma.pageBlock.findFirst({
      where: {
        id,
        page: {
          OR: [
            { userId },
            { workspace: { members: { some: { userId, role: { in: ['ADMIN', 'OWNER'] } } } } }
          ]
        }
      }
    });

    if (!block) {
      throw new Error('Block not found or insufficient permissions');
    }

    return this.prisma.pageBlock.update({
      where: { id },
      data: updateBlockDto,
    });
  }

  async remove(id: string, userId: string) {
    // Check if user has permission to delete the block
    const block = await this.prisma.pageBlock.findFirst({
      where: {
        id,
        page: { userId }
      }
    });

    if (!block) {
      throw new Error('Block not found or insufficient permissions');
    }

    // Store position to adjust other blocks later
    const position = block.position;
    const pageId = block.pageId;

    // Delete the block
    const deletedBlock = await this.prisma.pageBlock.delete({
      where: { id }
    });

    // Adjust positions of remaining blocks
    await this.prisma.pageBlock.updateMany({
      where: {
        pageId,
        position: { gt: position }
      },
      data: {
        position: { decrement: 1 }
      }
    });

    return deletedBlock;
  }

  async move(id: string, userId: string, newPosition: number) {
    // Check if user has permission to move the block
    const block = await this.prisma.pageBlock.findFirst({
      where: {
        id,
        page: {
          OR: [
            { userId },
            { workspace: { members: { some: { userId } } } }
          ]
        }
      }
    });

    if (!block) {
      throw new Error('Block not found or insufficient permissions');
    }

    const pageId = block.pageId;
    const oldPosition = block.position;

    if (newPosition === oldPosition) {
      return block;
    }

    // Update the position of the moved block
    await this.prisma.pageBlock.update({
      where: { id },
      data: { position: newPosition }
    });

    // Adjust positions of other blocks
    if (newPosition > oldPosition) {
      // Moving down: decrease position of blocks in between
      await this.prisma.pageBlock.updateMany({
        where: {
          pageId,
          position: {
            gt: oldPosition,
            lte: newPosition
          }
        },
        data: {
          position: { decrement: 1 }
        }
      });
    } else {
      // Moving up: increase position of blocks in between
      await this.prisma.pageBlock.updateMany({
        where: {
          pageId,
          position: {
            gte: newPosition,
            lt: oldPosition
          }
        },
        data: {
          position: { increment: 1 }
        }
      });
    }

    return this.prisma.pageBlock.findFirst({
      where: { id }
    });
  }
}