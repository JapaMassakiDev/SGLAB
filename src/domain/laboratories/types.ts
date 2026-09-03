export type LabStatus = 'available' | 'occupied' | 'maintenance' | 'closed' | 'inactive';

export interface Laboratory {
  id: string;
  name: string;
  code: string;
  capacity: number;
  computersCount: number;
  location: string;
  status: LabStatus;
  installedSoftware: string[];
  description: string;
  equipmentCount: number;
  supervisorName: string;
  openTime: string; // "07:30"
  closeTime: string; // "22:30"
  tags: string[];
  currentOccupant?: string;
  currentActivity?: string;
}
