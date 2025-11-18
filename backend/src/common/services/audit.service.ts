import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async logAction(
    userId: string, 
    entityType: string, 
    entityId: string, 
    action: string, 
    workspaceId?: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          workspaceId,
          entityType,
          entityId,
          action,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
          ipAddress: ipAddress || null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log audit action: ${error}`);
      // Don't throw error to prevent audit logging from breaking the main operation
    }
  }

  async getEntityHistory(entityType: string, entityId: string, limit: number = 50) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        }
      }
    });
  }

  async getUserActivity(userId: string, days: number = 30) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    return this.prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: sinceDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}