import { prisma } from './db/prisma';

/**
 * Checks if a user has a specific permission.
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.role) return false;

  // super_admin always has all permissions
  if (user.role.name === 'super_admin') return true;

  return user.role.permissions.some(
    (rp) => rp.permission.name === permissionName
  );
}

/**
 * Checks if a user has a specific role.
 */
export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || !user.role) return false;

  // super_admin acts as any role
  if (user.role.name === 'super_admin') return true;

  return user.role.name === roleName;
}

/**
 * Gets all permissions for a user.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.role) return [];

  return user.role.permissions.map((rp) => rp.permission.name);
}
