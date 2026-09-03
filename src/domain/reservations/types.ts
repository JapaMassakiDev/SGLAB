import type { Role } from '../auth/types';

export type ReservationType = 'lab' | 'equipment';

export type ReservationStatus =
  | 'confirmed'
  | 'pending_approval'
  | 'cancelled'
  | 'completed';

export interface RecurrenceRule {
  frequency: 'weekly' | 'biweekly';
  daysOfWeek: number[]; // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sab
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  totalOccurrences: number;
}

export interface Reservation {
  id: string;
  title: string;
  type: ReservationType;
  resourceId: string;
  resourceName: string;
  resourceCodeOrTag: string;
  userId: string;
  userName: string;
  userRole: Role;
  userDepartment?: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  purpose: string;
  attendeesCount?: number;
  status: ReservationStatus;
  isRecurring: boolean;
  seriesId?: string;
  recurrenceRule?: RecurrenceRule;
  approvedBy?: string;
  approvedAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  resourceType: ReservationType;
  resourceId: string;
  resourceName: string;
  userId: string;
  userName: string;
  userRole: Role;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  purpose: string;
  priorityScore: number; // 100 for teacher, 50 for student + waiting bonus
  status: 'waiting' | 'notified' | 'claimed' | 'cancelled' | 'expired';
  createdAt: string;
  notifiedAt?: string;
  expiresAt?: string;
}
