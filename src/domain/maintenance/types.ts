export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

export type MaintenanceStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_parts'
  | 'resolved'
  | 'discarded';

export interface MaintenanceOrder {
  id: string;
  orderNumber: string; // Ex: "OS-2026-008"
  title?: string;
  equipmentId: string;
  equipmentName: string;
  equipmentTag: string;
  reportedBy: string;
  reportedAt: string; // ISO date-time
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  problemDescription: string;
  diagnosis?: string;
  partsUsed?: string[];
  resolutionNotes?: string;
  resolvedAt?: string;
  downtimeHours?: number;
}
