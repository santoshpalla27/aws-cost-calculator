import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('NotificationsGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // The client should send a message to join their user room
    // This would typically be done after authentication
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-user')
  handleJoinUser(client: Socket, payload: { userId: string }) {
    // Join the user-specific room
    client.join(`user_${payload.userId}`);
    this.logger.log(`Client ${client.id} joined user room: user_${payload.userId}`);
    
    return {
      event: 'joined',
      data: { room: `user_${payload.userId}` }
    };
  }

  @SubscribeMessage('join-workspace')
  handleJoinWorkspace(client: Socket, payload: { workspaceId: string }) {
    // Join the workspace room
    client.join(`workspace_${payload.workspaceId}`);
    this.logger.log(`Client ${client.id} joined workspace room: workspace_${payload.workspaceId}`);
    
    return {
      event: 'joined',
      data: { room: `workspace_${payload.workspaceId}` }
    };
  }

  @SubscribeMessage('join-project')
  handleJoinProject(client: Socket, payload: { projectId: string }) {
    // Join the project room
    client.join(`project_${payload.projectId}`);
    this.logger.log(`Client ${client.id} joined project room: project_${payload.projectId}`);
    
    return {
      event: 'joined',
      data: { room: `project_${payload.projectId}` }
    };
  }

  // Method to send task update notifications
  notifyTaskUpdate(taskId: string, data: any) {
    // Notify all users in the project room about the task update
    this.server.to(`task_${taskId}`).emit('task-updated', data);
  }

  // Method to send comment notifications
  notifyNewComment(taskId: string, comment: any) {
    // Notify users in the project room about the new comment
    this.server.to(`task_${taskId}`).emit('comment-added', comment);
  }

  // Method to broadcast general notifications
  broadcastNotification(userId: string, notification: any) {
    // Notify the specific user
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // Method to notify about user presence
  notifyUserJoined(workspaceId: string, user: any) {
    this.server.to(`workspace_${workspaceId}`).emit('user-joined', user);
  }

  notifyUserLeft(workspaceId: string, user: any) {
    this.server.to(`workspace_${workspaceId}`).emit('user-left', user);
  }

  // Method to notify about typing indicators
  notifyUserTyping(userId: string, taskId: string, user: any) {
    // Emit to the task room excluding the typing user
    this.server.to(`task_${taskId}`).except(userId).emit('user-typing', user);
  }
}