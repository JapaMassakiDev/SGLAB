import type {
  IAuthRepository,
  ILabRepository,
  IEquipmentRepository,
  IReservationRepository,
  IWaitlistRepository,
  ICustodyRepository,
  IMaintenanceRepository,
  INotificationRepository,
  IAuditRepository,
} from '../../application/ports';
import type { User, Role } from '../../domain/auth/types';
import type { Laboratory } from '../../domain/laboratories/types';
import type { Equipment } from '../../domain/equipment/types';
import type { Reservation, RecurrenceRule, WaitlistEntry } from '../../domain/reservations/types';
import type { CustodyRecord } from '../../domain/custody/types';
import type { MaintenanceOrder } from '../../domain/maintenance/types';
import type { Notification } from '../../domain/notifications/types';
import type { AuditLogEntry } from '../../domain/audit/types';

import { mockStore } from '../storage/store';
import { simulateNetworkDelay } from '../latency/simulator';

// Helper to check time overlap
export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export class MockAuthRepository implements IAuthRepository {
  async getCurrentUser(): Promise<User> {
    return simulateNetworkDelay(() => mockStore.getCurrentUser());
  }

  async switchUser(role: Role): Promise<User> {
    return simulateNetworkDelay(() => mockStore.setCurrentUserRole(role));
  }

  async getAvailableUsers(): Promise<User[]> {
    return simulateNetworkDelay(() => mockStore.getData().users);
  }
}

export class MockLabRepository implements ILabRepository {
  async findAll(): Promise<Laboratory[]> {
    return simulateNetworkDelay(() => mockStore.getLabs());
  }

  async findById(id: string): Promise<Laboratory | null> {
    return simulateNetworkDelay(() => mockStore.getLabs().find((l) => l.id === id) || null);
  }

  async create(lab: Omit<Laboratory, 'id'>): Promise<Laboratory> {
    return simulateNetworkDelay(() => mockStore.addLab(lab));
  }

  async update(id: string, updates: Partial<Laboratory>): Promise<Laboratory> {
    return simulateNetworkDelay(() => mockStore.updateLab(id, updates));
  }
}

export class MockEquipmentRepository implements IEquipmentRepository {
  async findAll(): Promise<Equipment[]> {
    return simulateNetworkDelay(() => mockStore.getEquipment());
  }

  async findById(id: string): Promise<Equipment | null> {
    return simulateNetworkDelay(() => mockStore.getEquipment().find((e) => e.id === id) || null);
  }

  async create(item: Omit<Equipment, 'id'>): Promise<Equipment> {
    return simulateNetworkDelay(() => mockStore.addEquipment(item));
  }

  async update(id: string, updates: Partial<Equipment>): Promise<Equipment> {
    return simulateNetworkDelay(() => mockStore.updateEquipment(id, updates));
  }
}

export class MockReservationRepository implements IReservationRepository {
  async findAll(): Promise<Reservation[]> {
    return simulateNetworkDelay(() => mockStore.getReservations());
  }

  async findById(id: string): Promise<Reservation | null> {
    return simulateNetworkDelay(() => mockStore.getReservations().find((r) => r.id === id) || null);
  }

  async findConflicting(
    resourceId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string
  ): Promise<Reservation[]> {
    return simulateNetworkDelay(() => {
      return mockStore
        .getReservations()
        .filter(
          (r) =>
            r.id !== excludeReservationId &&
            r.resourceId === resourceId &&
            r.date === date &&
            r.status !== 'cancelled' &&
            isTimeOverlapping(startTime, endTime, r.startTime, r.endTime)
        );
    });
  }

  async create(reservation: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation> {
    return simulateNetworkDelay(async () => {
      // Validate conflict
      const conflicts = await this.findConflicting(
        reservation.resourceId,
        reservation.date,
        reservation.startTime,
        reservation.endTime
      );

      if (conflicts.length > 0) {
        throw new Error(
          `Conflito detectado: O recurso "${reservation.resourceName}" já possui reserva neste horário (${conflicts[0].startTime} às ${conflicts[0].endTime}) por ${conflicts[0].userName}.`
        );
      }

      return mockStore.addReservation(reservation);
    });
  }

  async createRecurring(
    baseReservation: Omit<Reservation, 'id' | 'createdAt' | 'isRecurring'>,
    rule: RecurrenceRule
  ): Promise<{ created: Reservation[]; conflicts: string[] }> {
    return simulateNetworkDelay(() => {
      const createdList: Reservation[] = [];
      const conflictDates: string[] = [];
      const seriesId = `series-${Date.now()}`;

      const cur = new Date(rule.startDate + 'T12:00:00');
      const end = new Date(rule.endDate + 'T12:00:00');

      let stepDays = 7;
      if (rule.frequency === 'biweekly') stepDays = 14;

      while (cur <= end) {
        const dayOfWeek = cur.getDay();
        if (rule.daysOfWeek.includes(dayOfWeek)) {
          const dateStr = cur.toISOString().split('T')[0];

          // Check conflict
          const conflicts = mockStore
            .getReservations()
            .filter(
              (r) =>
                r.resourceId === baseReservation.resourceId &&
                r.date === dateStr &&
                r.status !== 'cancelled' &&
                isTimeOverlapping(baseReservation.startTime, baseReservation.endTime, r.startTime, r.endTime)
            );

          if (conflicts.length > 0) {
            conflictDates.push(dateStr);
          } else {
            const res = mockStore.addReservation({
              ...baseReservation,
              date: dateStr,
              isRecurring: true,
              seriesId,
              recurrenceRule: rule,
            });
            createdList.push(res);
          }
        }
        cur.setDate(cur.getDate() + (rule.daysOfWeek.length === 1 ? stepDays : 1));
      }

      return { created: createdList, conflicts: conflictDates };
    });
  }

  async cancel(id: string, reason: string): Promise<Reservation> {
    return simulateNetworkDelay(() => mockStore.cancelReservation(id, reason));
  }

  async approve(id: string, approverName: string): Promise<Reservation> {
    return simulateNetworkDelay(() => mockStore.approveReservation(id, approverName));
  }
}

export class MockWaitlistRepository implements IWaitlistRepository {
  async findAll(): Promise<WaitlistEntry[]> {
    return simulateNetworkDelay(() => mockStore.getWaitlist());
  }

  async findByResource(resourceId: string, date: string): Promise<WaitlistEntry[]> {
    return simulateNetworkDelay(() =>
      mockStore
        .getWaitlist()
        .filter((w) => w.resourceId === resourceId && w.date === date && w.status === 'waiting')
    );
  }

  async join(
    entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'status' | 'priorityScore'>
  ): Promise<WaitlistEntry> {
    return simulateNetworkDelay(() => mockStore.joinWaitlist(entry));
  }

  async cancel(id: string): Promise<void> {
    return simulateNetworkDelay(() => mockStore.cancelWaitlist(id));
  }

  async promoteTopCandidate(
    resourceId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<WaitlistEntry | null> {
    return simulateNetworkDelay(() => {
      const candidates = mockStore
        .getWaitlist()
        .filter(
          (w) =>
            w.resourceId === resourceId &&
            w.date === date &&
            w.status === 'waiting' &&
            isTimeOverlapping(startTime, endTime, w.startTime, w.endTime)
        )
        .sort((a, b) => b.priorityScore - a.priorityScore);

      if (candidates.length === 0) return null;
      const top = candidates[0];
      top.status = 'claimed';
      return top;
    });
  }
}

export class MockCustodyRepository implements ICustodyRepository {
  async findAll(): Promise<CustodyRecord[]> {
    return simulateNetworkDelay(() => mockStore.getCustodyRecords());
  }

  async findById(id: string): Promise<CustodyRecord | null> {
    return simulateNetworkDelay(() => mockStore.getCustodyRecords().find((c) => c.id === id) || null);
  }

  async checkout(record: Omit<CustodyRecord, 'id' | 'status'>): Promise<CustodyRecord> {
    return simulateNetworkDelay(() => mockStore.addCustodyRecord(record));
  }

  async checkin(
    id: string,
    returnNotes: string,
    hasDamage: boolean,
    damageReport?: string
  ): Promise<CustodyRecord> {
    return simulateNetworkDelay(() =>
      mockStore.checkinCustody(id, returnNotes, hasDamage, damageReport)
    );
  }
}

export class MockMaintenanceRepository implements IMaintenanceRepository {
  async findAll(): Promise<MaintenanceOrder[]> {
    return simulateNetworkDelay(() => mockStore.getMaintenanceOrders());
  }

  async findById(id: string): Promise<MaintenanceOrder | null> {
    return simulateNetworkDelay(() => mockStore.getMaintenanceOrders().find((m) => m.id === id) || null);
  }

  async create(
    order: Omit<MaintenanceOrder, 'id' | 'orderNumber' | 'reportedAt'>
  ): Promise<MaintenanceOrder> {
    return simulateNetworkDelay(() => mockStore.addMaintenanceOrder(order));
  }

  async updateStatus(
    id: string,
    status: MaintenanceOrder['status'],
    resolutionNotes?: string,
    technicianName?: string
  ): Promise<MaintenanceOrder> {
    return simulateNetworkDelay(() =>
      mockStore.updateMaintenanceStatus(id, status, resolutionNotes, technicianName)
    );
  }
}

export class MockNotificationRepository implements INotificationRepository {
  async findAll(userId?: string): Promise<Notification[]> {
    return simulateNetworkDelay(() => mockStore.getNotifications(userId));
  }

  async markAsRead(id: string): Promise<void> {
    return simulateNetworkDelay(() => mockStore.markNotificationAsRead(id));
  }

  async markAllAsRead(_userId?: string): Promise<void> {
    return simulateNetworkDelay(() => mockStore.markAllNotificationsAsRead());
  }

  async create(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    return simulateNetworkDelay(() => mockStore.addNotification(notification));
  }
}

export class MockAuditRepository implements IAuditRepository {
  async findAll(): Promise<AuditLogEntry[]> {
    return simulateNetworkDelay(() => mockStore.getAuditLogs());
  }

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    return simulateNetworkDelay(() => mockStore.addAuditLog(entry));
  }
}

// Singleton instances exposed to Application Services / Context
export const authRepo = new MockAuthRepository();
export const labRepo = new MockLabRepository();
export const equipmentRepo = new MockEquipmentRepository();
export const reservationRepo = new MockReservationRepository();
export const waitlistRepo = new MockWaitlistRepository();
export const custodyRepo = new MockCustodyRepository();
export const maintenanceRepo = new MockMaintenanceRepository();
export const notificationRepo = new MockNotificationRepository();
export const auditRepo = new MockAuditRepository();
