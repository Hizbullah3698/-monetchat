import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db/prisma';
import { GET as getUsers } from '../src/app/api/admin/users/route';
import { GET as getUser, PATCH as patchUser, DELETE as deleteUser } from '../src/app/api/admin/users/[id]/route';
import { GET as getProducts } from '../src/app/api/admin/products/route';
import { PATCH as updateProductStatus } from '../src/app/api/admin/products/[id]/status/route';
import { GET as getStats } from '../src/app/api/admin/stats/route';
import { generateToken } from '../src/lib/auth/jwt';

async function verify() {
  console.log('--- Starting Admin API Verification ---');

  // 1. Get the admin user we seeded
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@monetchat.local' },
    include: { role: true },
  });

  if (!admin) throw new Error('Admin user not found. Run seed-admin.ts first.');

  // 2. Generate a token
  const token = await generateToken({
    userId: admin.id,
    email: admin.email,
    role: admin.role.name,
  });

  // Mock cookie string
  const cookieHeader = `auth_token=${token}`;

  const createMockRequest = (url: string, method: string = 'GET', body: any = null) => {
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers: {
        cookie: cookieHeader,
        'Authorization': `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });
  };

  // Test GET /api/admin/stats
  console.log('\nTesting GET /api/admin/stats...');
  const statsRes = await getStats(createMockRequest('/api/admin/stats'), { params: {} });
  const statsData = await statsRes.json();
  console.log('Stats status:', statsRes.status);
  console.log('Stats overview:', statsData.data.overview);

  // Test GET /api/admin/users
  console.log('\nTesting GET /api/admin/users...');
  const usersRes = await getUsers(createMockRequest('/api/admin/users'), { params: {} });
  const usersData = await usersRes.json();
  console.log('Users status:', usersRes.status);
  if (usersRes.status !== 200) {
    console.error('Users error:', usersData);
  } else {
    console.log('Users count:', usersData.data.data.length);
  }

  // Test GET /api/admin/users/[id]
  console.log(`\nTesting GET /api/admin/users/${admin.id}...`);
  const userRes = await getUser(createMockRequest(`/api/admin/users/${admin.id}`), { params: { id: admin.id } });
  const userData = await userRes.json();
  console.log('User status:', userRes.status);
  if (userRes.status !== 200) {
    console.error('User error:', userData);
  } else {
    console.log('User name:', userData.data.name);
  }

  // Test PATCH /api/admin/users/[id] (update name)
  console.log('\nTesting PATCH /api/admin/users/[id]...');
  const patchUserRes = await patchUser(createMockRequest(`/api/admin/users/${admin.id}`, 'PATCH', { name: 'Super Admin' }), { params: { id: admin.id } });
  const patchUserData = await patchUserRes.json();
  console.log('Updated user name:', patchUserData.data.name);

  // Test GET /api/admin/products
  console.log('\nTesting GET /api/admin/products...');
  const productsRes = await getProducts(createMockRequest('/api/admin/products'), { params: {} });
  const productsData = await productsRes.json();
  console.log('Products count:', productsData.data.data.length);

  console.log('\n--- Verification Completed Successfully ---');
}

verify().catch(e => {
  console.error('\nVerification failed:', e);
  process.exit(1);
});
