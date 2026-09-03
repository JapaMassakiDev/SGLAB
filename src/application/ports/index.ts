import type { User, Role } from '../../domain/auth/types';
import type { Laboratory } from '../../domain/laboratories/types';
import type { Equipment } from '../../domain/equipment/types';
import type { Reservation, RecurrenceRule, WaitlistEntry } from '../../domain/reservations/types';
import type { CustodyRecord } from '../../domain/custody/types';
import type { MaintenanceOrder } from '../../domain/maintenance/types';
import type { Notification, SimulatedEmailLog } from '../../domain/notifications/types';
import type { AuditLogEntry } from '../../domain/audit/types';

export interface IAuthRepository {
  getCurrentUser(): Promise<User>;
  switchUser(role: Role): Promise<User>;
  getAvailableUsers(): Promise<User[]>;
}

export interface ILabRepository {
  findAll(): Promise<Laboratory[]>;
  findById(id: string): Promise<Laboratory | null>;
  create(lab: Omit<Laboratory, 'id'>): Promise<Laboratory>;
  update(id: string, updates: Partial<Laboratory>): Promise<Laboratory>;
}

export interface IEquipmentRepository {
  findAll(): Promise<Equipment[]>;
  findById(id: string): Promise<Equipment | null>;
  create(item: Omit<Equipment, 'id'>): Promise<Equipment>;
  update(id: string, updates: Partial<Equipment>): Promise<Equipment>;
}

export interface IReservationRepository {
  findAll(): Promise<Reservation[]>;
  findById(id: string): Promise<Reservation | null>;
  findConflicting(
    resourceId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string
  ): Promise<Reservation[]>;
  create(reservation: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation>;
  createRecurring(
    baseReservation: Omit<Reservation, 'id' | 'createdAt' | 'isRecurring'>,
    rule: RecurrenceRule
  ): Promise<{ created: Reservation[]; conflicts: string[] }>;
  cancel(id: string, reason: string): Promise<Reservation>;
  approve(id: string, approverName: string): Promise<Reservation>;
}

export interface IWaitlistRepository {
  findAll(): Promise<WaitlistEntry[]>;
  findByResource(resourceId: string, date: string): Promise<WaitlistEntry[]>;
  join(entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'status' | 'priorityScore'>): Promise<WaitlistEntry>;
  cancel(id: string): Promise<void>;
  promoteTopCandidate(resourceId: string, date: string, startTime: string, endTime: string): Promise<WaitlistEntry | null>;
  claimOpportunity(waitlistEntryId: string): Promise<Reservation>;
  expireOutdatedOpportunities(): Promise<WaitlistEntry[]>;
}

export interface ICustodyRepository {
  findAll(): Promise<CustodyRecord[]>;
  findById(id: string): Promise<CustodyRecord | null>;
  checkout(record: Omit<CustodyRecord, 'id' | 'status'>): Promise<CustodyRecord>;
  checkin(
    id: string,
    returnNotes: string,
    hasDamage: boolean,
    damageReport?: string
  ): Promise<CustodyRecord>;
  isUserBlockedByOverdue(userId: string): Promise<boolean>;
}

export interface IMaintenanceRepository {
  findAll(): Promise<MaintenanceOrder[]>;
  findById(id: string): Promise<MaintenanceOrder | null>;
  create(order: Omit<MaintenanceOrder, 'id' | 'orderNumber' | 'reportedAt'>): Promise<MaintenanceOrder>;
  updateStatus(
    id: string,
    status: MaintenanceOrder['status'],
    resolutionNotes?: string,
    technicianName?: string
  ): Promise<MaintenanceOrder>;
}

export interface INotificationRepository {
  findAll(userId?: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId?: string): Promise<void>;
  create(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification>;
  getEmailLogs(): Promise<SimulatedEmailLog[]>;
  sendSimulatedEmail(email: Omit<SimulatedEmailLog, 'id' | 'sentAt'>): Promise<SimulatedEmailLog>;
}

export interface IAuditRepository {
  findAll(): Promise<AuditLogEntry[]>;
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;
}

