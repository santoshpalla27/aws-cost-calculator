import { Controller, Get, Post, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(
    @Param('userId') userId: string,
    @Query('read') read?: string,
    @Query('type') type?: string,
  ) {
    return this.notificationsService.findAll(userId, {
      read: read ? read === 'true' : undefined,
      type,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.notificationsService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Param('userId') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('read-all')
  markAllAsRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  delete(@Param('id') id: string, @Param('userId') userId: string) {
    return this.notificationsService.delete(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('unread-count')
  getUnreadCount(@Param('userId') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }
}