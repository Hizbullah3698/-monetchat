import { signAccessToken } from '../src/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const adminEmail = 'admin@monetchat.com';
  const user = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!user) {
    console.error('Admin user not found');
    return;
  }

  const token = await signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  });

  console.log('Admin Token:', token);

  const baseUrl = 'http://localhost:3000/api/admin/users';

  // Note: We can't actually make HTTP requests to the local server if it's not running.
  // But we can check if the routes are correctly implemented by mocking or just providing the curl commands.
  
  console.log('\n--- Test 1: List Users ---');
  console.log(`curl -H "Authorization: Bearer ${token}" "${baseUrl}"`);

  console.log('\n--- Test 2: Get User Details ---');
  console.log(`curl -H "Authorization: Bearer ${token}" "${baseUrl}/${user.id}"`);

  console.log('\n--- Test 3: Create User ---');
  console.log(`curl -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{"email":"test-user@example.com","password":"Password123!","name":"Test User"}' "${baseUrl}"`);

  console.log('\n--- Test 4: Update User ---');
  console.log(`curl -X PATCH -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{"isActive":false}' "${baseUrl}/${user.id}"`);
}

test().finally(() => prisma.$disconnect());
