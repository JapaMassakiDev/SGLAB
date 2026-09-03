export type NotificationType = 'info' | 'success' | 'warning' | 'alert';

export interface Notification {
  id: string;
  userId?: string; // target user or undefined for all
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string; // ISO date-time
  linkTab?: string;
  actionRequired?: boolean;
}

export interface SimulatedEmailLog {
  id: string;
  to: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: string;
  context: 'reservation_created' | 'reservation_cancelled' | 'waitlist_opportunity' | 'maintenance_alert' | 'custody_overdue' | 'system';
}

