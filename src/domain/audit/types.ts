export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'USER_SWITCH'
  | 'LAB_CREATED'
  | 'LAB_UPDATED'
  | 'EQUIPMENT_CREATED'
  | 'EQUIPMENT_UPDATED'
  | 'RESERVATION_CREATED'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_APPROVED'
  | 'WAITLIST_JOINED'
  | 'WAITLIST_PROMOTED'
  | 'WAITLIST_CANCELLED'
  | 'CUSTODY_CHECKOUT'
  | 'CUSTODY_CHECKIN'
  | 'MAINTENANCE_CREATED'
  | 'MAINTENANCE_STATUS_CHANGED'
  | 'SCENARIO_LOADED';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO date-time
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  details: string;
  entityType: 'laboratory' | 'equipment' | 'reservation' | 'custody' | 'maintenance' | 'system';
  entityId: string;
  metadata?: Record<string, unknown>;
}
