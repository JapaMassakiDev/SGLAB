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
import type { Notification, SimulatedEmailLog } from '../../domain/notifications/types';
import type { AuditLogEntry } from '../../domain/audit/types';

import { mockStore, isTimeOverlapping } from '../storage/store';
import { simulateNetworkDelay } from '../latency/simulator';

export { isTimeOverlapping };

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

  private validateResourceAvailability(
    resourceId: string,
    resourceType: 'lab' | 'equipment',
    date: string,
    startTime: string,
    endTime: string,
    attendeesCount?: number
  ) {
    if (resourceType === 'lab') {
      const lab = mockStore.getLabs().find((l) => l.id === resourceId);
      if (lab) {
        if (lab.status === 'maintenance') {
          throw new Error(`Recurso Indisponível: O laboratório "${lab.name}" está em manutenção e não aceita reservas.`);
        }
        if (lab.status === 'inactive' || lab.status === 'closed') {
          throw new Error(`Recurso Inativo: O laboratório "${lab.name}" está desativado para reservas.`);
        }
        if (attendeesCount && attendeesCount > lab.capacity) {
          throw new Error(`Capacidade Excedida: O laboratório "${lab.name}" suporta no máximo ${lab.capacity} pessoas (solicitado: ${attendeesCount}).`);
        }
      }

      // Regra: laboratório reservado bloqueia equipamentos vinculados
      const linkedEquipmentIds = mockStore.getEquipment().filter((e) => e.labId === resourceId).map((e) => e.id);
      const conflictingEquipmentRes = mockStore.getReservations().find(
        (r) =>
          linkedEquipmentIds.includes(r.resourceId) &&
          r.date === date &&
          r.status !== 'cancelled' &&
          isTimeOverlapping(startTime, endTime, r.startTime, r.endTime)
      );
      if (conflictingEquipmentRes) {
        throw new Error(
          `Laboratório Bloqueado: O equipamento vinculado "${conflictingEquipmentRes.resourceName}" já possui reserva neste horário por ${conflictingEquipmentRes.userName}.`
        );
      }
    } else {
      const eq = mockStore.getEquipment().find((e) => e.id === resourceId);
      if (eq) {
        if (eq.status === 'maintenance') {
          throw new Error(`Recurso Indisponível: O equipamento "${eq.name}" está em manutenção e não aceita reservas.`);
        }
        if (eq.status === 'inactive') {
          throw new Error(`Recurso Inativo: O equipamento "${eq.name}" está desativado.`);
        }
        if (eq.status === 'damaged') {
          throw new Error(`Recurso Avariado: O equipamento "${eq.name}" está avariado aguardando manutenção.`);
        }
        // Regra: laboratório reservado bloqueia equipamentos vinculados
        if (eq.labId) {
          const parentLabRes = mockStore.getReservations().find(
            (r) =>
              r.resourceId === eq.labId &&
              r.date === date &&
              r.status !== 'cancelled' &&
              isTimeOverlapping(startTime, endTime, r.startTime, r.endTime)
          );
          if (parentLabRes) {
            throw new Error(
              `Equipamento Bloqueado: O laboratório vinculado "${eq.labName || 'vinculado'}" já está reservado neste horário por ${parentLabRes.userName}.`
            );
          }
        }
      }
    }
  }

  async create(reservation: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation> {
    return simulateNetworkDelay(async () => {
      // 1. Check if user has overdue custody
      if (mockStore.isUserBlockedByOverdue(reservation.userId)) {
        throw new Error(
          `Bloqueio de Devolução: O usuário "${reservation.userName}" possui empréstimo de equipamento com devolução em atraso. Regularize a entrega no Balcão de Custódia antes de solicitar novas reservas.`
        );
      }

      // 2. Validate resource status, capacity, and linked cross locks
      this.validateResourceAvailability(
        reservation.resourceId,
        reservation.type,
        reservation.date,
        reservation.startTime,
        reservation.endTime,
        reservation.attendeesCount
      );

      // 3. Validate direct conflict
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

      // Regra crítica: reservas simples aprovam automaticamente
      const finalStatus = reservation.status || 'confirmed';

      return mockStore.addReservation({
        ...reservation,
        status: finalStatus,
      });
    });
  }

  async createRecurring(
    baseReservation: Omit<Reservation, 'id' | 'createdAt' | 'isRecurring'>,
    rule: RecurrenceRule
  ): Promise<{ created: Reservation[]; conflicts: string[] }> {
    return simulateNetworkDelay(() => {
      // 1. Check if user is blocked by overdue custody
      if (mockStore.isUserBlockedByOverdue(baseReservation.userId)) {
        throw new Error(
          `Bloqueio de Devolução: O usuário "${baseReservation.userName}" possui empréstimo com devolução em atraso.`
        );
      }

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

          try {
            // Validate availability, capacity and cross locks for this date
            this.validateResourceAvailability(
              baseReservation.resourceId,
              baseReservation.type,
              dateStr,
              baseReservation.startTime,
              baseReservation.endTime,
              baseReservation.attendeesCount
            );

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
              // Regra crítica: reservas recorrentes ficam pendentes de aprovação!
              const res = mockStore.addReservation({
                ...baseReservation,
                date: dateStr,
                status: 'pending_approval',
                isRecurring: true,
                seriesId,
                recurrenceRule: rule,
              });
              createdList.push(res);
            }
          } catch {
            conflictDates.push(dateStr);
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
    return simulateNetworkDelay(() =>
      mockStore.autoPromoteWaitlist(resourceId, date, startTime, endTime)
    );
  }

  async claimOpportunity(waitlistEntryId: string): Promise<Reservation> {
    return simulateNetworkDelay(() => mockStore.claimWaitlistOpportunity(waitlistEntryId));
  }

  async expireOutdatedOpportunities(): Promise<WaitlistEntry[]> {
    return simulateNetworkDelay(() => mockStore.expireOutdatedOpportunities());
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

  async isUserBlockedByOverdue(userId: string): Promise<boolean> {
    return simulateNetworkDelay(() => mockStore.isUserBlockedByOverdue(userId));
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

  async getEmailLogs(): Promise<SimulatedEmailLog[]> {
    return simulateNetworkDelay(() => mockStore.getSimulatedEmails());
  }

  async sendSimulatedEmail(email: Omit<SimulatedEmailLog, 'id' | 'sentAt'>): Promise<SimulatedEmailLog> {
    return simulateNetworkDelay(() => mockStore.addSimulatedEmail(email));
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

