export interface NotificationRequest {
  campaignId?: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationFilters {
  organizerId?: string;
  campaignId?: string;
  type?: string[];
  priority?: string[];
  isRead?: boolean;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  campaign?: {
    id: string;
    title: string;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    [key: string]: number;
  };
  byPriority: {
    [key: string]: number;
  };
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  campaignUpdates: boolean;
  donorRegistrations: boolean;
  systemAlerts: boolean;
  weeklyReports: boolean;
  remindersBefore: number; // hours
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface BatchReadRequest {
  notificationIds: string[];
}

export interface UnreadCountResponse {
  count: number;
}

export interface TestNotificationRequest {
  campaignId: string;
  type: string;
}