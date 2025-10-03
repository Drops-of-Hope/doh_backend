import { prisma } from '../config/db.js';
import { NotificationFilters, NotificationStats } from '../types/notification.types.js';
import { Prisma, NotificationType } from '@prisma/client';

export const NotificationRepository = {
  // Create notification
  create: async (data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
  }) => {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as NotificationType,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  // Get notifications with filters
  findWithFilters: async (filters: NotificationFilters) => {
    const {
      organizerId,
      campaignId,
      type,
      isRead,
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {};

    if (organizerId) {
      where.userId = organizerId;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type && type.length > 0) {
      where.type = { in: type as NotificationType[] };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // If campaignId is provided, filter by metadata
    if (campaignId) {
      where.metadata = {
        path: ['campaignId'],
        equals: campaignId,
      };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  // Get notification by ID
  findById: async (id: string) => {
    return await prisma.notification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  // Mark as read
  markAsRead: async (id: string) => {
    return await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  },

  // Batch mark as read
  batchMarkAsRead: async (ids: string[]) => {
    return await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    });
  },

  // Mark all campaign notifications as read
  markAllCampaignAsRead: async (userId: string, campaignId: string) => {
    return await prisma.notification.updateMany({
      where: {
        userId,
        metadata: {
          path: ['campaignId'],
          equals: campaignId,
        },
      },
      data: { isRead: true },
    });
  },

  // Delete notification
  delete: async (id: string) => {
    return await prisma.notification.delete({
      where: { id },
    });
  },

  // Get unread count
  getUnreadCount: async (userId: string, campaignId?: string) => {
    const where: Prisma.NotificationWhereInput = {
      userId,
      isRead: false,
    };

    if (campaignId) {
      where.metadata = {
        path: ['campaignId'],
        equals: campaignId,
      };
    }

    return await prisma.notification.count({ where });
  },

  // Get notification statistics
  getStats: async (userId: string, from?: Date, to?: Date): Promise<NotificationStats> => {
    const where: Prisma.NotificationWhereInput = { userId };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [total, unread, byType] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
    ]);

    const typeStats: { [key: string]: number } = {};
    byType.forEach((item) => {
      typeStats[item.type] = item._count.type;
    });

    return {
      total,
      unread,
      byType: typeStats,
      byPriority: {}, // Priority not implemented in schema yet
    };
  },
};