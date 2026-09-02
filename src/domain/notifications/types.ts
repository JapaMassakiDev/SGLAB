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
