// Prisma Seed Script for Monetchat Marketplace
// Run: npx prisma db seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // SEED COUNTRIES
  // ============================================
  console.log('📍 Seeding countries...');

  await prisma.country.upsert({
    where: { code: 'KW' },
    update: {},
    create: {
      code: 'KW',
      name: 'Kuwait',
      nameAr: 'الكويت',
      currencyCode: 'KWD',
      currencySymbol: 'د.ك',
      phoneCode: '+965',
      isActive: true,
    },
  });

  await prisma.country.upsert({
    where: { code: 'SA' },
    update: {},
    create: {
      code: 'SA',
      name: 'Saudi Arabia',
      nameAr: 'السعودية',
      currencyCode: 'SAR',
      currencySymbol: 'ر.س',
      phoneCode: '+966',
      isActive: false, // Disabled for V1, Kuwait only
    },
  });

  // ============================================
  // SEED KUWAIT REGIONS
  // ============================================
  console.log('📍 Seeding Kuwait regions...');

  const kuwaitRegions = [
    { name: 'Kuwait City', nameAr: 'مدينة الكويت' },
    { name: 'Hawally', nameAr: 'حولي' },
    { name: 'Farwaniya', nameAr: 'الفروانية' },
    { name: 'Ahmadi', nameAr: 'الأحمدي' },
    { name: 'Jahra', nameAr: 'الجهراء' },
    { name: 'Mubarak Al-Kabeer', nameAr: 'مبارك الكبير' },
  ];

  for (const region of kuwaitRegions) {
    await prisma.region.upsert({
      where: {
        id: kuwaitRegions.indexOf(region) + 1,
      },
      update: {},
      create: {
        countryCode: 'KW',
        name: region.name,
        nameAr: region.nameAr,
        isActive: true,
      },
    });
  }

  // ============================================
  // SEED CATEGORIES
  // ============================================
  console.log('📦 Seeding categories...');

  const categories = [
    { slug: 'vehicles', name: 'Vehicles', nameAr: 'مركبات', icon: 'car', sortOrder: 1 },
    { slug: 'electronics', name: 'Electronics', nameAr: 'إلكترونيات', icon: 'smartphone', sortOrder: 2 },
    { slug: 'property', name: 'Property', nameAr: 'عقارات', icon: 'home', sortOrder: 3 },
    { slug: 'fashion', name: 'Fashion', nameAr: 'أزياء', icon: 'shirt', sortOrder: 4 },
    { slug: 'furniture', name: 'Furniture', nameAr: 'أثاث', icon: 'sofa', sortOrder: 5 },
    { slug: 'services', name: 'Services', nameAr: 'خدمات', icon: 'wrench', sortOrder: 6 },
    { slug: 'jobs', name: 'Jobs', nameAr: 'وظائف', icon: 'briefcase', sortOrder: 7 },
    { slug: 'other', name: 'Other', nameAr: 'أخرى', icon: 'package', sortOrder: 99 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        slug: category.slug,
        name: category.name,
        nameAr: category.nameAr,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }

  // ============================================
  // SEED PROHIBITED KEYWORDS
  // ============================================
  console.log('🚫 Seeding prohibited keywords...');

  const prohibitedKeywords = [
    // Alcohol
    { keyword: 'alcohol', keywordAr: 'كحول', category: 'alcohol' },
    { keyword: 'beer', keywordAr: 'بيرة', category: 'alcohol' },
    { keyword: 'wine', keywordAr: 'نبيذ', category: 'alcohol' },
    { keyword: 'whiskey', keywordAr: 'ويسكي', category: 'alcohol' },
    { keyword: 'vodka', keywordAr: 'فودكا', category: 'alcohol' },
    { keyword: 'liquor', keywordAr: 'خمر', category: 'alcohol' },
    // Weapons
    { keyword: 'gun', keywordAr: 'مسدس', category: 'weapons' },
    { keyword: 'rifle', keywordAr: 'بندقية', category: 'weapons' },
    { keyword: 'ammunition', keywordAr: 'ذخيرة', category: 'weapons' },
    { keyword: 'firearm', keywordAr: 'سلاح ناري', category: 'weapons' },
    // Drugs
    { keyword: 'drugs', keywordAr: 'مخدرات', category: 'drugs' },
    { keyword: 'marijuana', keywordAr: 'ماريجوانا', category: 'drugs' },
    { keyword: 'cocaine', keywordAr: 'كوكايين', category: 'drugs' },
    // Pork
    { keyword: 'pork', keywordAr: 'لحم خنزير', category: 'pork' },
    { keyword: 'bacon', keywordAr: 'لحم مقدد', category: 'pork' },
    { keyword: 'ham', keywordAr: 'لحم الخنزير المدخن', category: 'pork' },
  ];

  for (const keyword of prohibitedKeywords) {
    const existing = await prisma.prohibitedKeyword.findFirst({
      where: { keyword: keyword.keyword },
    });

    if (!existing) {
      await prisma.prohibitedKeyword.create({
        data: {
          keyword: keyword.keyword,
          keywordAr: keyword.keywordAr,
          category: keyword.category,
          countryCodes: ['KW', 'SA'],
        },
      });
    }
  }

  // ============================================
  // SEED ROLES & PERMISSIONS
  // ============================================
  console.log('🔐 Seeding roles & permissions...');

  const permissions = [
    { name: 'users:read', description: 'Read user information' },
    { name: 'users:write', description: 'Create and update users' },
    { name: 'users:delete', description: 'Delete users' },
    { name: 'products:create', description: 'Create products' },
    { name: 'products:edit', description: 'Edit own products' },
    { name: 'products:delete', description: 'Delete own products' },
    { name: 'products:moderate', description: 'Moderate all products' },
    { name: 'categories:manage', description: 'Manage product categories' },
    { name: 'analytics:view', description: 'View market analytics' },
    { name: 'roles:manage', description: 'Manage roles and permissions' },
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const p = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
    createdPermissions.push(p);
  }

  const roleDefinitions = [
    {
      name: 'super_admin',
      description: 'Full access to everything',
      permissions: permissions.map(p => p.name),
    },
    {
      name: 'admin',
      description: 'Administrative access for moderation and management',
      permissions: [
        'users:read',
        'users:write',
        'products:moderate',
        'categories:manage',
        'analytics:view',
      ],
    },
    {
      name: 'user',
      description: 'Standard marketplace user',
      permissions: [
        'products:create',
        'products:edit',
        'products:delete',
      ],
    },
  ];

  for (const roleDef of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
      },
    });

    // Assign permissions
    for (const permName of roleDef.permissions) {
      const perm = createdPermissions.find(p => p.name === permName);
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }


  console.log('✅ Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
