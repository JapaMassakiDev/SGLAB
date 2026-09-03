export type EquipmentCategory =
  | 'osciloscopio'
  | 'prototipagem'
  | 'vr_ar'
  | 'computacao'
  | 'impressao_3d'
  | 'audiovisual'
  | 'redes';

export type EquipmentStatus =
  | 'available'
  | 'in_use'
  | 'reserved'
  | 'maintenance'
  | 'damaged'
  | 'inactive';

export interface Equipment {
  id: string;
  name: string;
  tag: string; // Ex: "PAT-0042"
  category: EquipmentCategory;
  brand: string;
  model: string;
  serialNumber: string;
  status: EquipmentStatus;
  location: string;
  labId?: string;
  labName?: string;
  specifications: Record<string, string>;
  accessories: string[];
  currentUserId?: string;
  currentUserName?: string;
  notes?: string;
  requiresSpecialTraining?: boolean;
}
