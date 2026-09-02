import type { Role } from '../auth/types';

export type CustodyStatus = 'active' | 'returned' | 'late' | 'damaged';

export interface CustodyRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentTag: string;
  userId: string;
  userName: string;
  userRole: Role;
  userEmail: string;
  technicianId: string;
  technicianName: string;
  checkoutDate: string; // ISO date-time
  expectedReturnDate: string; // ISO date-time
  actualReturnDate?: string; // ISO date-time
  status: CustodyStatus;
  accessoriesChecked: string[];
  initialConditionNotes: string;
  returnConditionNotes?: string;
  signatureSimulated: boolean;
  hasDamage: boolean;
  damageSeverity?: 'none' | 'light' | 'moderate' | 'severe';
  damageReport?: string;
  maintenanceTicketCreated?: boolean;
}
