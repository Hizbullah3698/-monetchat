import { prisma } from '../src/lib/db/prisma';
import { hashPassword } from '../src/lib/auth';

async function main() {
  // Ensure roles exist
  const roles = ['buyer', 'seller', 'admin', 'super_admin'];
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} role` },
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) throw new Error('Admin role not found');

  // Ensure admin user exists
  const adminEmail = 'admin@monetchat.local';
  const hashedPassword = await hashPassword('Admin@123');

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'System Admin',
      passwordHash: hashedPassword,
      roleId: adminRole.id,
      isVerified: true,
      isActive: true,
      countryCode: 'KW',
    },
  });

  console.log('Seeding completed: Admin user and roles are ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
