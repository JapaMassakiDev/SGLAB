import type { User, Role } from '../../domain/auth/types';
import type { Laboratory } from '../../domain/laboratories/types';
import type { Equipment } from '../../domain/equipment/types';
import type { Reservation, WaitlistEntry } from '../../domain/reservations/types';
import type { CustodyRecord } from '../../domain/custody/types';
import type { MaintenanceOrder } from '../../domain/maintenance/types';
import type { Notification, SimulatedEmailLog } from '../../domain/notifications/types';
import type { AuditLogEntry } from '../../domain/audit/types';
import type { Clock } from '../../domain/time/clock';
import { defaultClock } from '../../domain/time/clock';

import {
  SEED_USERS,
  SEED_LABS,
  SEED_EQUIPMENT,
  SEED_RESERVATIONS,
  SEED_WAITLIST,
  SEED_CUSTODY,
  SEED_MAINTENANCE,
  SEED_NOTIFICATIONS,
  SEED_SIMULATED_EMAILS,
  SEED_AUDIT,
} from './seeds';

export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export type ScenarioName = 'default' | 'high_conflict' | 'empty';

export interface AppStoreData {
  currentUser: User;
  users: User[];
  laboratories: Laboratory[];
  equipment: Equipment[];
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  custodyRecords: CustodyRecord[];
  maintenanceOrders: MaintenanceOrder[];
  notifications: Notification[];
  simulatedEmails: SimulatedEmailLog[];
  auditLogs: AuditLogEntry[];
  currentScenario: ScenarioName;
}

const STORAGE_KEY = 'labtech_state_v1';

type Listener = () => void;

class MockDataStore {
  private data: AppStoreData;
  private listeners: Set<Listener> = new Set();
  private clock: Clock = defaultClock;

  constructor() {
    this.data = this.loadFromStorage();
  }

  public getClock(): Clock {
    return this.clock;
  }

  public setClock(clock: Clock): void {
    this.clock = clock;
    this.notify();
  }

  public now(): Date {
    return this.clock.now();
  }

  private loadFromStorage(): AppStoreData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Basic schema check
        if (parsed.users && parsed.laboratories && parsed.equipment) {
          if (!parsed.simulatedEmails) {
            parsed.simulatedEmails = JSON.parse(JSON.stringify(SEED_SIMULATED_EMAILS));
          }
          return parsed;
        }
      }
    } catch {
      // Fallback if localStorage disabled or error
    }
    return this.createDefaultData();
  }

  private createDefaultData(): AppStoreData {
    return {
      currentUser: { ...SEED_USERS[0] }, // Default: Admin
      users: JSON.parse(JSON.stringify(SEED_USERS)),
      laboratories: JSON.parse(JSON.stringify(SEED_LABS)),
      equipment: JSON.parse(JSON.stringify(SEED_EQUIPMENT)),
      reservations: JSON.parse(JSON.stringify(SEED_RESERVATIONS)),
      waitlist: JSON.parse(JSON.stringify(SEED_WAITLIST)),
      custodyRecords: JSON.parse(JSON.stringify(SEED_CUSTODY)),
      maintenanceOrders: JSON.parse(JSON.stringify(SEED_MAINTENANCE)),
      notifications: JSON.parse(JSON.stringify(SEED_NOTIFICATIONS)),
      simulatedEmails: JSON.parse(JSON.stringify(SEED_SIMULATED_EMAILS)),
      auditLogs: JSON.parse(JSON.stringify(SEED_AUDIT)),
      currentScenario: 'default',
    };
  }


  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // localStorage quota or restricted
    }
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // Get snapshot
  public getData(): AppStoreData {
    return this.data;
  }

  // Session & User
  public getCurrentUser(): User {
    return this.data.currentUser;
  }

  public setCurrentUserRole(role: Role): User {
    const user = this.data.users.find((u) => u.role === role) || this.data.users[0];
    this.data.currentUser = { ...user };
    this.addAuditLog({
      action: 'USER_SWITCH',
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `Alternou para o perfil: ${user.name} (${user.role.toUpperCase()})`,
      entityType: 'system',
      entityId: user.id,
    });
    this.persist();
    return this.data.currentUser;
  }

  // Laboratories
  public getLabs(): Laboratory[] {
    return this.data.laboratories;
  }

  public updateLab(id: string, updates: Partial<Laboratory>): Laboratory {
    const idx = this.data.laboratories.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error(`Laboratório ${id} não encontrado`);
    this.data.laboratories[idx] = { ...this.data.laboratories[idx], ...updates };
    this.persist();
    return this.data.laboratories[idx];
  }

  public addLab(lab: Omit<Laboratory, 'id'>): Laboratory {
    const newLab: Laboratory = {
      ...lab,
      id: `lab-${Date.now()}`,
    };
    this.data.laboratories.push(newLab);
    this.addAuditLog({
      action: 'LAB_CREATED',
      userId: this.data.currentUser.id,
      userName: this.data.currentUser.name,
      userRole: this.data.currentUser.role,
      details: `Criou o laboratório ${newLab.name} (${newLab.code})`,
      entityType: 'laboratory',
      entityId: newLab.id,
    });
    this.persist();
    return newLab;
  }

  // Equipment
  public getEquipment(): Equipment[] {
    return this.data.equipment;
  }

  public updateEquipment(id: string, updates: Partial<Equipment>): Equipment {
    const idx = this.data.equipment.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Equipamento ${id} não encontrado`);
    this.data.equipment[idx] = { ...this.data.equipment[idx], ...updates };
    this.persist();
    return this.data.equipment[idx];
  }

  public addEquipment(item: Omit<Equipment, 'id'>): Equipment {
    const newItem: Equipment = {
      ...item,
      id: `eq-${Date.now()}`,
    };
    this.data.equipment.push(newItem);
    this.addAuditLog({
      action: 'EQUIPMENT_CREATED',
      userId: this.data.currentUser.id,
      userName: this.data.currentUser.name,
      userRole: this.data.currentUser.role,
      details: `Cadastrou o equipamento ${newItem.name} (${newItem.tag})`,
      entityType: 'equipment',
      entityId: newItem.id,
    });
    this.persist();
    return newItem;
  }

  // Reservations
  public getReservations(): Reservation[] {
    return this.data.reservations;
  }

  public addReservation(res: Omit<Reservation, 'id' | 'createdAt'>): Reservation {
    // Check if user has overdue custody
    if (this.isUserBlockedByOverdue(res.userId)) {
      throw new Error(
        `Bloqueio de Devolução: O usuário "${res.userName}" possui empréstimo de equipamento com devolução em atraso. Regularize a entrega no Balcão de Custódia antes de agendar novas reservas.`
      );
    }

    const newRes: Reservation = {
      ...res,
      id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: this.now().toISOString(),
    };
    this.data.reservations.push(newRes);

    this.addAuditLog({
      action: 'RESERVATION_CREATED',
      userId: this.data.currentUser.id,
      userName: this.data.currentUser.name,
      userRole: this.data.currentUser.role,
      details: `Reserva criada para ${newRes.resourceName} em ${newRes.date} das ${newRes.startTime} às ${newRes.endTime} (${newRes.status})`,
      entityType: 'reservation',
      entityId: newRes.id,
    });

    this.addNotification({
      title: 'Reserva Registrada',
      message: `A reserva para ${newRes.resourceName} (${newRes.date} ${newRes.startTime}) foi agendada [${newRes.status === 'confirmed' ? 'Aprovada' : 'Pendente'}].`,
      type: newRes.status === 'confirmed' ? 'success' : 'info',
      linkTab: 'reservations',
      userId: newRes.userId,
    });

    this.addSimulatedEmail({
      to: `${newRes.userId}@instituto.edu.br`,
      recipientName: newRes.userName,
      subject: `[LabTech] Confirmação de Agendamento — ${newRes.resourceName}`,
      body: `Olá ${newRes.userName}, sua solicitação de reserva para ${newRes.resourceName} em ${newRes.date} (${newRes.startTime} às ${newRes.endTime}) foi registrada com o status: ${newRes.status.toUpperCase()}.`,
      context: 'reservation_created',
    });

    this.persist();
    return newRes;
  }

  public cancelReservation(id: string, reason: string): Reservation {
    const idx = this.data.reservations.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Reserva ${id} não encontrada`);
    const cancelled = {
      ...this.data.reservations[idx],
      status: 'cancelled' as const,
      cancellationReason: reason,
    };
    this.data.reservations[idx] = cancelled;

    this.addAuditLog({
      action: 'RESERVATION_CANCELLED',
      userId: this.data.currentUser.id,
      userName: this.data.currentUser.name,
      userRole: this.data.currentUser.role,
      details: `Reserva ${cancelled.id} cancelada. Motivo: ${reason}`,
      entityType: 'reservation',
      entityId: cancelled.id,
    });

    this.addSimulatedEmail({
      to: `${cancelled.userId}@instituto.edu.br`,
      recipientName: cancelled.userName,
      subject: `[LabTech] Cancelamento de Reserva — ${cancelled.resourceName}`,
      body: `Olá ${cancelled.userName}, informamos que a reserva para ${cancelled.resourceName} em ${cancelled.date} (${cancelled.startTime} às ${cancelled.endTime}) foi cancelada. Motivo: ${reason}.`,
      context: 'reservation_cancelled',
    });

    // Check waitlist auto-promotion: grant 30-minute opportunity to FIFO candidate
    this.autoPromoteWaitlist(cancelled.resourceId, cancelled.date, cancelled.startTime, cancelled.endTime);

    this.persist();
    return cancelled;
  }

  public approveReservation(id: string, approverName: string): Reservation {
    const idx = this.data.reservations.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Reserva ${id} não encontrada`);
    const approved = {
      ...this.data.reservations[idx],
      status: 'confirmed' as const,
      approvedBy: approverName,
      approvedAt: this.now().toISOString(),
    };
    this.data.reservations[idx] = approved;

    this.addAuditLog({
      action: 'RESERVATION_APPROVED',
      userId: this.data.currentUser.id,
      userName: this.data.currentUser.name,
      userRole: this.data.currentUser.role,
      details: `Reserva ${approved.id} aprovada por ${approverName}`,
      entityType: 'reservation',
      entityId: approved.id,
    });

    this.addNotification({
      title: 'Reserva Aprovada',
      message: `Sua reserva para ${approved.resourceName} em ${approved.date} foi formalmente aprovada por ${approverName}.`,
      type: 'success',
      linkTab: 'reservations',
      userId: approved.userId,
    });

    this.addSimulatedEmail({
      to: `${approved.userId}@instituto.edu.br`,
      recipientName: approved.userName,
      subject: `[LabTech] Reserva Aprovada — ${approved.resourceName}`,
      body: `Prezado(a) ${approved.userName}, sua reserva para ${approved.resourceName} (${approved.date} ${approved.startTime}-${approved.endTime}) foi formalmente aprovada pela coordenação.`,
      context: 'reservation_created',
    });

    this.persist();
    return approved;
  }

  // Waitlist
  public getWaitlist(): WaitlistEntry[] {
    return this.data.waitlist;
  }

  public joinWaitlist(
    entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'status' | 'priorityScore'>
  ): WaitlistEntry {
    const priorityScore = entry.userRole === 'teacher' ? 100 : entry.userRole === 'student' ? 50 : 75;
    const newEntry: WaitlistEntry = {
      ...entry,
      id: `wait-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      priorityScore,
      status: 'waiting',
      createdAt: this.now().toISOString(),
    };
    this.data.waitlist.push(newEntry);

    this.addAuditLog({
      action: 'WAITLIST_JOINED',
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      details: `Entrou na fila de espera para ${entry.resourceName} (${entry.date} ${entry.startTime})`,
      entityType: 'reservation',
      entityId: newEntry.id,
    });

    this.addNotification({
      title: 'Fila de Espera Registrada',
      message: `Você entrou na fila de espera para ${entry.resourceName}. Se a vaga abrir, você receberá uma janela de 30 minutos para confirmar.`,
      type: 'info',
      linkTab: 'waitlist',
      userId: entry.userId,
    });

    this.persist();
    return newEntry;
  }

  public cancelWaitlist(id: string): void {
    const entry = this.data.waitlist.find((w) => w.id === id);
    if (entry) {
      entry.status = 'cancelled';
      this.addAuditLog({
        action: 'WAITLIST_CANCELLED',
        userId: this.data.currentUser.id,
        userName: this.data.currentUser.name,
        userRole: this.data.currentUser.role,
        details: `Cancelou inscrição na fila de espera para ${entry.resourceName}`,
        entityType: 'reservation',
        entityId: entry.id,
      });
      this.persist();
    }
  }

  public autoPromoteWaitlist(
    resourceId: string,
    date: string,
    startTime: string,
    endTime: string
  ): WaitlistEntry | null {
    // FIFO matching
    const matchingEntries = this.data.waitlist
      .filter(
        (w) =>
          w.resourceId === resourceId &&
          w.date === date &&
          w.status === 'waiting' &&
          isTimeOverlapping(startTime, endTime, w.startTime, w.endTime)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (matchingEntries.length > 0) {
      const topCandidate = matchingEntries[0];
      topCandidate.status = 'notified';
      topCandidate.notifiedAt = this.now().toISOString();
      // Exactly 30-minute opportunity window
      topCandidate.expiresAt = new Date(this.now().getTime() + 30 * 60 * 1000).toISOString();

      this.addNotification({
        title: '⏰ Oportunidade na Fila (30 minutos)',
        message: `Uma vaga para ${topCandidate.resourceName} (${topCandidate.date} das ${topCandidate.startTime} às ${topCandidate.endTime}) abriu! Você tem 30 minutos para confirmar sua reserva.`,
        type: 'warning',
        linkTab: 'waitlist',
        actionRequired: true,
        userId: topCandidate.userId,
      });

      this.addSimulatedEmail({
        to: `${topCandidate.userId}@instituto.edu.br`,
        recipientName: topCandidate.userName,
        subject: `[LabTech] Oportunidade de Reserva Liberada (30 min) — ${topCandidate.resourceName}`,
        body: `Olá ${topCandidate.userName}, uma vaga está disponível para ${topCandidate.resourceName} na data ${topCandidate.date} (${topCandidate.startTime} às ${topCandidate.endTime}). Você possui exatamente 30 minutos (até ${new Date(topCandidate.expiresAt).toLocaleTimeString('pt-BR')}) para aceitar no sistema. Caso contrário, a vaga será concedida ao próximo solicitante da fila.`,
        context: 'waitlist_opportunity',
      });

      this.addAuditLog({
        action: 'WAITLIST_NOTIFIED',
        userId: topCandidate.userId,
        userName: topCandidate.userName,
        userRole: topCandidate.userRole,
        details: `Janela de 30 minutos de oportunidade concedida para ${topCandidate.userName} em ${topCandidate.resourceName}`,
        entityType: 'reservation',
        entityId: topCandidate.id,
      });

      this.persist();
      return topCandidate;
    }
    return null;
  }

  public claimWaitlistOpportunity(waitlistEntryId: string): Reservation {
    const entry = this.data.waitlist.find((w) => w.id === waitlistEntryId);
    if (!entry) throw new Error('Entrada da fila de espera não encontrada.');
    if (entry.status !== 'notified') {
      throw new Error('Esta vaga não está em período de reivindicação ativa.');
    }
    if (entry.expiresAt && this.now().getTime() > new Date(entry.expiresAt).getTime()) {
      entry.status = 'expired';
      this.persist();
      throw new Error('O prazo de 30 minutos para reivindicar esta vaga expirou.');
    }

    entry.status = 'claimed';

    const res: Reservation = {
      id: `res-waitlist-${Date.now()}`,
      title: `[Fila Confirmada] ${entry.purpose}`,
      type: entry.resourceType,
      resourceId: entry.resourceId,
      resourceName: entry.resourceName,
      resourceCodeOrTag: entry.resourceId,
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      purpose: entry.purpose,
      status: 'confirmed',
      isRecurring: false,
      createdAt: this.now().toISOString(),
    };

    this.data.reservations.push(res);

    this.addNotification({
      title: '🎉 Reserva Confirmada pela Fila!',
      message: `Sua oportunidade para ${entry.resourceName} foi confirmada com sucesso.`,
      type: 'success',
      linkTab: 'reservations',
      userId: entry.userId,
    });

    this.addSimulatedEmail({
      to: `${entry.userId}@instituto.edu.br`,
      recipientName: entry.userName,
      subject: `[LabTech] Reserva Confirmada via Fila de Espera — ${entry.resourceName}`,
      body: `Olá ${entry.userName}, sua reserva para ${entry.resourceName} (${entry.date} ${entry.startTime}-${entry.endTime}) foi confirmada após aceite dentro do prazo de 30 minutos.`,
      context: 'reservation_created',
    });

    this.addAuditLog({
      action: 'WAITLIST_CLAIMED',
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      details: `Candidato aceitou a oportunidade de 30 min da fila e converteu em reserva ativa para ${entry.resourceName}`,
      entityType: 'reservation',
      entityId: res.id,
    });

    this.persist();
    return res;
  }

  public expireOutdatedOpportunities(): WaitlistEntry[] {
    const nowMs = this.now().getTime();
    const expiredList: WaitlistEntry[] = [];

    for (const entry of this.data.waitlist) {
      if (entry.status === 'notified' && entry.expiresAt && nowMs > new Date(entry.expiresAt).getTime()) {
        entry.status = 'expired';
        expiredList.push(entry);

        this.addAuditLog({
          action: 'WAITLIST_EXPIRED',
          userId: entry.userId,
          userName: entry.userName,
          userRole: entry.userRole,
          details: `Janela de 30 minutos expirou para ${entry.userName} em ${entry.resourceName}. Repassando para o próximo da fila.`,
          entityType: 'reservation',
          entityId: entry.id,
        });

        this.addNotification({
          title: '⏰ Oportunidade Expirada',
          message: `O prazo de 30 minutos para confirmar ${entry.resourceName} expirou. A vaga foi repassada para o próximo da fila.`,
          type: 'alert',
          linkTab: 'waitlist',
          userId: entry.userId,
        });

        // Offer opportunity to next candidate in queue (FIFO)
        this.autoPromoteWaitlist(entry.resourceId, entry.date, entry.startTime, entry.endTime);
      }
    }

    if (expiredList.length > 0) {
      this.persist();
    }
    return expiredList;
  }


  // Custody Desk
  public getCustodyRecords(): CustodyRecord[] {
    return this.data.custodyRecords;
  }

  public isUserBlockedByOverdue(userId: string): boolean {
    const nowMs = this.now().getTime();
    return this.data.custodyRecords.some((c) => {
      if (c.userId !== userId) return false;
      if (c.status === 'late') return true;
      if (c.status === 'active' && nowMs > new Date(c.expectedReturnDate).getTime()) return true;
      return false;
    });
  }

  public addCustodyRecord(rec: Omit<CustodyRecord, 'id' | 'status'>): CustodyRecord {
    const newRecord: CustodyRecord = {
      ...rec,
      id: `cust-${Date.now()}`,
      status: 'active',
    };
    this.data.custodyRecords.push(newRecord);

    // Update equipment status to 'in_use'
    const eq = this.data.equipment.find((e) => e.id === rec.equipmentId);
    if (eq) {
      eq.status = 'in_use';
      eq.currentUserId = rec.userId;
      eq.currentUserName = rec.userName;
    }

    this.addAuditLog({
      action: 'CUSTODY_CHECKOUT',
      userId: rec.technicianId,
      userName: rec.technicianName,
      userRole: 'technician',
      details: `Check-out de ${rec.equipmentName} (${rec.equipmentTag}) para ${rec.userName}`,
      entityType: 'custody',
      entityId: newRecord.id,
    });

    this.addNotification({
      title: 'Equipamento Retirado',
      message: `Retirada de ${rec.equipmentName} registrada. Devolução prevista para ${new Date(rec.expectedReturnDate).toLocaleDateString('pt-BR')}.`,
      type: 'info',
      linkTab: 'custody',
      userId: rec.userId,
    });

    this.addSimulatedEmail({
      to: rec.userEmail || `${rec.userId}@instituto.edu.br`,
      recipientName: rec.userName,
      subject: `[LabTech Custódia] Comprovante de Retirada — ${rec.equipmentName}`,
      body: `Olá ${rec.userName}, você retirou o equipamento ${rec.equipmentName} (${rec.equipmentTag}) sob responsabilidade da técnica ${rec.technicianName}. Devolução prevista: ${new Date(rec.expectedReturnDate).toLocaleString('pt-BR')}. Evite atrasos para manter o direito a novas reservas.`,
      context: 'system',
    });

    this.persist();
    return newRecord;
  }

  public checkinCustody(
    id: string,
    returnNotes: string,
    hasDamage: boolean,
    damageReport?: string
  ): CustodyRecord {
    const idx = this.data.custodyRecords.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Registro de custódia ${id} não encontrado`);
    const current = this.data.custodyRecords[idx];
    const isLate = this.now().getTime() > new Date(current.expectedReturnDate).getTime();

    const updated: CustodyRecord = {
      ...current,
      actualReturnDate: this.now().toISOString(),
      status: hasDamage ? 'damaged' : isLate ? 'late' : 'returned',
      returnConditionNotes: returnNotes,
      hasDamage,
      damageReport,
    };
    this.data.custodyRecords[idx] = updated;

    // Update equipment status
    const eq = this.data.equipment.find((e) => e.id === current.equipmentId);
    if (eq) {
      eq.status = hasDamage ? 'damaged' : 'available';
      eq.currentUserId = undefined;
      eq.currentUserName = undefined;
      if (hasDamage) {
        eq.notes = damageReport;
      }
    }

    // Auto-create maintenance order if damage reported
    if (hasDamage) {
      this.addMaintenanceOrder({
        title: `Reparo emergencial pós-devolução: ${current.equipmentName}`,
        equipmentId: current.equipmentId,
        equipmentName: current.equipmentName,
        equipmentTag: current.equipmentTag,
        reportedBy: this.data.currentUser.name,
        assignedTechnicianName: 'Ana Silva Santos',
        priority: 'high',
        status: 'open',
        problemDescription: `Avaria detectada na devolução por ${current.userName}: ${damageReport || returnNotes}`,
      });
      updated.maintenanceTicketCreated = true;
    }

    this.addAuditLog({
      action: 'CUSTODY_CHECKIN',
      userId: this.data.currentUser.id,
      userName: this.data.currentUser.name,
      userRole: this.data.currentUser.role,
      details: `Check-in de ${current.equipmentName}. Avaria: ${hasDamage ? 'SIM' : 'NÃO'}. Atraso: ${isLate ? 'SIM' : 'NÃO'}`,
      entityType: 'custody',
      entityId: updated.id,
    });

    this.persist();
    return updated;
  }

  // Maintenance
  public getMaintenanceOrders(): MaintenanceOrder[] {
    return this.data.maintenanceOrders;
  }

  public addMaintenanceOrder(
    order: Omit<MaintenanceOrder, 'id' | 'orderNumber' | 'reportedAt'>
  ): MaintenanceOrder {
    const orderNum = `OS-${this.now().getFullYear()}-${String(this.data.maintenanceOrders.length + 1).padStart(3, '0')}`;
    const newOrder: MaintenanceOrder = {
      ...order,
      id: `maint-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber: orderNum,
      reportedAt: this.now().toISOString(),
    };
    this.data.maintenanceOrders.push(newOrder);

    // Lock resource status to 'maintenance'
    const eq = this.data.equipment.find((e) => e.id === order.equipmentId);
    if (eq) {
      eq.status = 'maintenance';
      eq.notes = order.problemDescription;
    }
    const lab = this.data.laboratories.find((l) => l.id === order.equipmentId);
    if (lab) {
      lab.status = 'maintenance';
      lab.currentActivity = `Em manutenção (${newOrder.orderNumber})`;
    }

    // Cascade cancel affected future reservations
    const affectedReservations = this.data.reservations.filter((r) => {
      if (r.status === 'cancelled') return false;
      if (r.resourceId === order.equipmentId) return true;
      if (lab && r.type === 'equipment') {
        const item = this.data.equipment.find((e) => e.id === r.resourceId);
        if (item?.labId === lab.id) return true;
      }
      return false;
    });

    for (const res of affectedReservations) {
      res.status = 'cancelled';
      res.cancellationReason = `Cancelada automaticamente devido à abertura de Ordem de Manutenção (${newOrder.orderNumber}: ${order.problemDescription})`;

      this.addNotification({
        title: '🚨 Reserva Cancelada por Manutenção',
        message: `Sua reserva para "${res.resourceName}" em ${res.date} (${res.startTime} às ${res.endTime}) foi cancelada devido à abertura da Ordem de Serviço ${newOrder.orderNumber}.`,
        type: 'alert',
        linkTab: 'reservations',
        userId: res.userId,
      });

      this.addSimulatedEmail({
        to: `${res.userId}@instituto.edu.br`,
        recipientName: res.userName,
        subject: `[LabTech Manutenção] Reserva Cancelada — ${res.resourceName}`,
        body: `Prezado(a) ${res.userName}, informamos que sua reserva em ${res.date} (${res.startTime}-${res.endTime}) para ${res.resourceName} precisou ser cancelada em virtude de manutenção (${newOrder.orderNumber}: ${order.problemDescription}). Pedimos desculpas pelo transtorno.`,
        context: 'maintenance_alert',
      });

      this.addAuditLog({
        action: 'RESERVATION_CANCELLED_BY_MAINTENANCE',
        userId: this.data.currentUser.id,
        userName: this.data.currentUser.name,
        userRole: this.data.currentUser.role,
        details: `Reserva ${res.id} (${res.resourceName}) cancelada em cascata devido à manutenção ${newOrder.orderNumber}`,
        entityType: 'reservation',
        entityId: res.id,
      });
    }

    this.addAuditLog({
      action: 'MAINTENANCE_CREATED',
      userId: this.data.currentUser.id,
      userName: this.data.currentUser.name,
      userRole: this.data.currentUser.role,
      details: `Abertura da ordem de serviço ${newOrder.orderNumber} para ${order.equipmentName}. ${affectedReservations.length} reservas canceladas em cascata.`,
      entityType: 'maintenance',
      entityId: newOrder.id,
    });

    this.addNotification({
      title: 'Chamado de Manutenção Aberto',
      message: `Ordem ${newOrder.orderNumber} registrada para ${order.equipmentName}. ${affectedReservations.length} reserva(s) afetada(s) cancelada(s).`,
      type: 'warning',
      linkTab: 'maintenance',
    });

    this.persist();
    return newOrder;
  }

  public updateMaintenanceStatus(
    id: string,
    status: MaintenanceOrder['status'],
    resolutionNotes?: string,
    technicianName?: string
  ): MaintenanceOrder {
    const idx = this.data.maintenanceOrders.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error(`Ordem ${id} não encontrada`);
    const current = this.data.maintenanceOrders[idx];

    const updated: MaintenanceOrder = {
      ...current,
      status,
      resolutionNotes: resolutionNotes || current.resolutionNotes,
      assignedTechnicianName: technicianName || current.assignedTechnicianName,
      resolvedAt: status === 'resolved' ? this.now().toISOString() : current.resolvedAt,
    };
    this.data.maintenanceOrders[idx] = updated;

    // If resolved or discarded, release equipment / laboratory back to available
    if (status === 'resolved') {
      const eq = this.data.equipment.find((e) => e.id === current.equipmentId);
      if (eq) {
        eq.status = 'available';
        eq.notes = undefined;
      }
      const lab = this.data.laboratories.find((l) => l.id === current.equipmentId);
      if (lab) {
        lab.status = 'available';
        lab.currentActivity = 'Livre para agendamento';
      }
    }

    this.addAuditLog({
      action: 'MAINTENANCE_STATUS_CHANGED',
      userId: this.data.currentUser.id,
      userName: this.data.currentUser.name,
      userRole: this.data.currentUser.role,
      details: `OS ${current.orderNumber} alterada para status: ${status.toUpperCase()}`,
      entityType: 'maintenance',
      entityId: updated.id,
    });

    this.persist();
    return updated;
  }

  // Simulated Email Dispatcher
  public getSimulatedEmails(): SimulatedEmailLog[] {
    return this.data.simulatedEmails || [];
  }

  public addSimulatedEmail(
    email: Omit<SimulatedEmailLog, 'id' | 'sentAt'>
  ): SimulatedEmailLog {
    const newEmail: SimulatedEmailLog = {
      ...email,
      id: `mail-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sentAt: this.now().toISOString(),
    };
    if (!this.data.simulatedEmails) {
      this.data.simulatedEmails = [];
    }
    this.data.simulatedEmails.unshift(newEmail);
    if (this.data.simulatedEmails.length > 100) {
      this.data.simulatedEmails = this.data.simulatedEmails.slice(0, 100);
    }
    return newEmail;
  }


  // Notifications
  public getNotifications(userId?: string): Notification[] {
    if (!userId) return this.data.notifications;
    return this.data.notifications.filter((n) => !n.userId || n.userId === userId);
  }

  public addNotification(
    notif: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ): Notification {
    const newNotif: Notification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      read: false,
      createdAt: this.now().toISOString(),
    };
    this.data.notifications.unshift(newNotif);
    this.persist();
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const n = this.data.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      this.persist();
    }
  }

  public markAllNotificationsAsRead(): void {
    this.data.notifications.forEach((n) => (n.read = true));
    this.persist();
  }

  // Audit Logs
  public getAuditLogs(): AuditLogEntry[] {
    return this.data.auditLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: this.now().toISOString(),
    };
    this.data.auditLogs.unshift(newEntry);
    // Keep max 200 logs
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    return newEntry;
  }

  // Scenario Switcher
  public loadScenario(name: ScenarioName): void {
    const today = this.now().toISOString().split('T')[0];

    if (name === 'default') {
      this.data = this.createDefaultData();
    } else if (name === 'empty') {
      this.data = {
        currentUser: { ...SEED_USERS[0] },
        users: JSON.parse(JSON.stringify(SEED_USERS)),
        laboratories: JSON.parse(JSON.stringify(SEED_LABS)).map((l: Laboratory) => ({
          ...l,
          status: 'available',
          currentActivity: 'Livre',
          currentOccupant: undefined,
        })),
        equipment: JSON.parse(JSON.stringify(SEED_EQUIPMENT)).map((e: Equipment) => ({
          ...e,
          status: 'available',
          currentUserId: undefined,
          currentUserName: undefined,
        })),
        reservations: [],
        waitlist: [],
        custodyRecords: [],
        maintenanceOrders: [],
        notifications: [],
        simulatedEmails: [],
        auditLogs: [],
        currentScenario: 'empty',
      };
    } else if (name === 'high_conflict') {

      // Create high conflict scenario: all labs fully booked throughout the day
      const base = this.createDefaultData();
      const conflictReservations: Reservation[] = [
        {
          id: 'conf-01',
          title: 'Aula Magna: Computação Quântica',
          type: 'lab',
          resourceId: 'lab-01',
          resourceName: 'Laboratório de Redes e Infraestrutura',
          resourceCodeOrTag: 'LAB-RED-101',
          userId: 'usr-teach-01',
          userName: 'Prof. Roberto Alencar',
          userRole: 'teacher',
          date: today,
          startTime: '08:00',
          endTime: '12:00',
          purpose: 'Prática de simulação de circuitos quânticos',
          status: 'confirmed',
          isRecurring: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'conf-02',
          title: 'Competição CTF Hackathon',
          type: 'lab',
          resourceId: 'lab-01',
          resourceName: 'Laboratório de Redes e Infraestrutura',
          resourceCodeOrTag: 'LAB-RED-101',
          userId: 'usr-admin-01',
          userName: 'Dr. Marcelo Valença',
          userRole: 'admin',
          date: today,
          startTime: '13:00',
          endTime: '18:00',
          purpose: 'Desafio de segurança ofensiva e defensiva',
          status: 'confirmed',
          isRecurring: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'conf-03',
          title: 'Maratona Maker Robótica',
          type: 'lab',
          resourceId: 'lab-02',
          resourceName: 'Laboratório de Prototipagem & IoT',
          resourceCodeOrTag: 'LAB-IOT-102',
          userId: 'usr-teach-01',
          userName: 'Prof. Roberto Alencar',
          userRole: 'teacher',
          date: today,
          startTime: '08:00',
          endTime: '18:00',
          purpose: 'Montagem intensiva dos robôs para competição estadual',
          status: 'confirmed',
          isRecurring: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'conf-04',
          title: 'Treinamento de LLMs Multimodais',
          type: 'lab',
          resourceId: 'lab-03',
          resourceName: 'Laboratório de IA & HPC',
          resourceCodeOrTag: 'LAB-HPC-201',
          userId: 'usr-admin-01',
          userName: 'Dr. Marcelo Valença',
          userRole: 'admin',
          date: today,
          startTime: '08:00',
          endTime: '22:00',
          purpose: 'Cluster GPU alocado 100% para fine-tuning',
          status: 'confirmed',
          isRecurring: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const conflictWaitlist: WaitlistEntry[] = [
        {
          id: 'conf-wait-01',
          resourceType: 'lab',
          resourceId: 'lab-01',
          resourceName: 'Laboratório de Redes e Infraestrutura',
          userId: 'usr-stud-01',
          userName: 'Lucas Mendes Prado',
          userRole: 'student',
          date: today,
          startTime: '13:00',
          endTime: '18:00',
          purpose: 'Necessito testar trabalho de TCC com roteador',
          priorityScore: 50,
          status: 'waiting',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'conf-wait-02',
          resourceType: 'lab',
          resourceId: 'lab-01',
          resourceName: 'Laboratório de Redes e Infraestrutura',
          userId: 'usr-teach-01',
          userName: 'Prof. Roberto Alencar',
          userRole: 'teacher',
          date: today,
          startTime: '13:00',
          endTime: '18:00',
          purpose: 'Aula extra de reposição de Redes II',
          priorityScore: 100,
          status: 'waiting',
          createdAt: new Date().toISOString(),
        },
      ];

      base.reservations = conflictReservations;
      base.waitlist = conflictWaitlist;
      base.currentScenario = 'high_conflict';
      this.data = base;
    }

    this.addAuditLog({
      action: 'SCENARIO_LOADED',
      userId: this.data.currentUser.id,
      userName: this.data.currentUser.name,
      userRole: this.data.currentUser.role,
      details: `Carregou o cenário de teste: ${name.toUpperCase()}`,
      entityType: 'system',
      entityId: name,
    });

    this.persist();
  }
}

export const mockStore = new MockDataStore();
