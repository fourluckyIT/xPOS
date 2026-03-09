import type { Role } from '@/types';

const ROLE_LEVEL: Record<Role, number> = {
  super_admin: 3,
  manager: 2,
  staff: 1,
};

export function hasAccess(userRole: Role, requiredRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    super_admin: 'Super Admin',
    manager: 'ผู้จัดการ',
    staff: 'พนักงาน',
  };
  return labels[role];
}

export function getRoleColor(role: Role): string {
  const colors: Record<Role, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    staff: 'bg-green-100 text-green-800',
  };
  return colors[role];
}
