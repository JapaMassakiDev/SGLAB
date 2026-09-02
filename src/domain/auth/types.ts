export type Role = 'admin' | 'technician' | 'teacher' | 'student';

export type Permission =
  | 'manage_labs'
  | 'manage_equipment'
  | 'create_reservation'
  | 'create_recurring_reservation'
  | 'approve_reservation'
  | 'cancel_reservation'
  | 'view_audit'
  | 'manage_maintenance'
  | 'custody_checkout'
  | 'custody_checkin'
  | 'view_waitlist'
  | 'join_waitlist'
  | 'manage_scenarios';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  department?: string;
  matricula?: string;
  avatar: string;
  permissions: Permission[];
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'manage_labs',
    'manage_equipment',
    'create_reservation',
    'create_recurring_reservation',
    'approve_reservation',
    'cancel_reservation',
    'view_audit',
    'manage_maintenance',
    'custody_checkout',
    'custody_checkin',
    'view_waitlist',
    'join_waitlist',
    'manage_scenarios',
  ],
  technician: [
    'manage_equipment',
    'create_reservation',
    'cancel_reservation',
    'manage_maintenance',
    'custody_checkout',
    'custody_checkin',
    'view_waitlist',
    'join_waitlist',
  ],
  teacher: [
    'create_reservation',
    'create_recurring_reservation',
    'cancel_reservation',
    'view_waitlist',
    'join_waitlist',
  ],
  student: [
    'create_reservation',
    'cancel_reservation',
    'view_waitlist',
    'join_waitlist',
  ],
};
