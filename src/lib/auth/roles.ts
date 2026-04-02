// Centralized role definitions and helpers for RBAC.

export const ROLE_USER = 'user' as const;
export const ROLE_SELLER = 'seller' as const;
export const ROLE_ADMIN = 'admin' as const;
export const ROLE_SUPER_ADMIN = 'super_admin' as const;

export const ROLE_ORDER: Record<RoleName, number> = {
  [ROLE_USER]: 0,
  [ROLE_SELLER]: 1,
  [ROLE_ADMIN]: 2,
  [ROLE_SUPER_ADMIN]: 3,
};

export type RoleName =
  | typeof ROLE_USER
  | typeof ROLE_SELLER
  | typeof ROLE_ADMIN
  | typeof ROLE_SUPER_ADMIN;

export const ALL_ROLES: RoleName[] = [
  ROLE_USER,
  ROLE_SELLER,
  ROLE_ADMIN,
  ROLE_SUPER_ADMIN,
];

export function isRoleAtLeast(role: RoleName, minimum: RoleName): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[minimum];
}
