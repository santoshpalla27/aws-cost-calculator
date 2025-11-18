import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Server } from 'socket.io';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(userId: string, type: string, title: string, message: string, data?: any) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
      },
    });

    return notification;
  }

  async findAll(userId: string, filters?: { read?: boolean; type?: string }) {
    const whereClause: any = {
      userId,
    };

    if (filters?.read !== undefined) {
      whereClause.read = filters.read;
    }
    if (filters?.type) {
      whereClause.type = filters.type;
    }

    return this.prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    // Check if the notification belongs to the user
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found or insufficient permissions');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async delete(id: string, userId: string) {
    // Check if the notification belongs to the user
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found or insufficient permissions');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async sendNotificationToUser(
    server: Server,
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: any
  ) {
    // Create the notification in the database
    const notification = await this.createNotification(userId, type, title, message, data);

    // Emit the notification to the user via WebSocket
    server.to(`user_${userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
    });

    return notification;
  }

  async sendNotificationToWorkspace(
    server: Server,
    workspaceId: string,
    type: string,
    title: string,
    message: string,
    data?: any,
    excludeUserId?: string
  ) {
    // Get all users in the workspace
    const workspaceMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true }
    });

    const userIds = workspaceMembers.map(member => member.userId);
    
    // Create notifications for all users in the workspace
    const notifications = await Promise.all(
      userIds
        .filter(id => id !== excludeUserId) // Exclude the user who triggered the action if specified
        .map(userId => 
          this.createNotification(userId, type, title, message, data)
        )
    );

    // Emit the notification to all users in the workspace via WebSocket
    userIds
      .filter(id => id !== excludeUserId)
      .forEach(userId => {
        server.to(`user_${userId}`).emit('notification', {
          id: notifications.find(n => n.userId === userId)?.id,
          type,
          title,
          message,
          data,
          createdAt: new Date(),
        });
      });

    return notifications;
  }
}