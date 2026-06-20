import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Notification } from '../entities/notification.entity';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Get user notifications with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            type: 'tip_received',
            title: 'You received a tip!',
            message: 'John Doe sent you 10.5 XLM',
            read: false,
            createdAt: '2024-01-15T00:00:00Z',
          },
        ],
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async getNotifications(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    return this.notificationsService.getNotifications(
      req.user!.id,
      +page,
      +limit,
    );
  }

  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      example: {
        unreadCount: 5,
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request): Promise<{ unreadCount: number }> {
    return this.notificationsService.getUnreadCount(req.user!.id);
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'tip_received',
        title: 'You received a tip!',
        message: 'John Doe sent you 10.5 XLM',
        read: true,
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:05:00Z',
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markAsRead(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(id, req.user!.id);
  }
}
