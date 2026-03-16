import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

const DATA_FILE = 'C:\\inetpub\\wwwroot\\pickpickdata\\q84sale_listings.json';

async function main() {
  console.log(`Starting import from ${DATA_FILE}...`);

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`File not found: ${DATA_FILE}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const listings: any[] = JSON.parse(rawData);

  console.log(`Loaded ${listings.length} listings. Processing unique sellers...`);

  // Ensure 'KW' country exists to satisfy foreign key constraints
  console.log('Ensuring Kuwait (KW) exists in the database...');
  await prisma.country.upsert({
    where: { code: 'KW' },
    update: {},
    create: {
      code: 'KW',
      name: 'Kuwait',
      nameAr: 'الكويت',
      currencyCode: 'KWD',
      currencySymbol: 'KD',
      phoneCode: '+965',
      isActive: true,
    }
  });

  // 1. Process Sellers First
  const uniqueSellersMap = new Map<string, string>(); // name -> userId
  
  // Create a default dummy password for generated sellers
  const defaultPasswordHash = await bcrypt.hash('Abc12345!', 10);

  for (const listing of listings) {
    const sellerName = listing.seller_name?.trim();
    if (!sellerName) continue;
    
    if (!uniqueSellersMap.has(sellerName)) {
      uniqueSellersMap.set(sellerName, '');
    }
  }

  console.log(`Found ${uniqueSellersMap.size} unique sellers. Upserting...`);

  let newSellersCount = 0;
  for (const sellerName of uniqueSellersMap.keys()) {
    // Attempt to find existing user with this 'name' (not ideal, assuming businessName here)
    const normalizedEmail = `seller_${Buffer.from(sellerName).toString('hex').substring(0, 10)}@monetchat.local`.toLowerCase();
    
    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: {
        id: uuidv4(),
        email: normalizedEmail,
        passwordHash: defaultPasswordHash,
        name: sellerName.substring(0, 100),
        role: 'seller',
        isVerified: false,
        isActive: true,
        countryCode: 'KW'
      }
    });

    // Upsert Seller
    await prisma.seller.upsert({
      where: { userId: user.id },
      update: {
        businessName: sellerName.substring(0, 255)
      },
      create: {
        userId: user.id,
        businessName: sellerName.substring(0, 255),
        phonePublic: '00000000',
        rating: 0,
        totalReviews: 0,
        totalSales: 0,
        isVerified: false
      }
    });

    uniqueSellersMap.set(sellerName, user.id);
    newSellersCount++;
  }

  console.log(`Sellers processed. Starting products import (Batch processing)...`);

  // 2. Process Products
  const batchSize = 100;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize);
    
    for (const listing of batch) {
      try {
        const sellerName = listing.seller_name?.trim();
        const sellerId = sellerName ? uniqueSellersMap.get(sellerName) : null;

        if (!sellerId) {
          console.log(`[SKIP] Missing seller for listing: ${listing.title}`);
          skipCount++;
          continue;
        }

        // Check if product already exists (by title + sellerId to avoid obvious duplicates)
        const existing = await prisma.product.findFirst({
          where: {
            title: listing.title,
            sellerId: sellerId
          }
        });

        if (existing) {
          skipCount++;
          continue;
        }

        // Determine coordinates (dummy or null for now, or parsed if available)
        // Extract basic data
        const price = listing.price ? parseFloat(listing.price) : 0;
        
        // Parse dates roughly
        const createdAt = listing.posted_date_estimated 
            ? new Date(listing.posted_date_estimated) 
            : new Date();

        // Create Product
        const product = await prisma.product.create({
          data: {
            id: uuidv4(),
            sellerId: sellerId,
            title: listing.title.substring(0, 255),
            description: listing.description || null,
            price: price,
            currency: 'KWD',
            isNegotiable: true,
            countryCode: 'KW',
            status: 'active',
            condition: 'good',
            createdAt: createdAt,
            updatedAt: createdAt
          }
        });

        // Insert Images
        if (listing.images && Array.isArray(listing.images)) {
          const imagePromises = listing.images.map((url: string, index: number) => {
             return prisma.productImage.create({
               data: {
                 id: uuidv4(),
                 productId: product.id,
                 url: url,
                 s3Key: url.split('/').pop() || `imported_${uuidv4()}`,
                 isPrimary: index === 0,
                 sortOrder: index,
                 createdAt: createdAt
               }
             });
          });
          
          await Promise.all(imagePromises);
        }

        successCount++;
      } catch (err: any) {
        console.error(`[FAIL] Error inserting listing "${listing.title}":`, err.message);
        failCount++;
      }
    }
    
    console.log(`Processed ${Math.min(i + batchSize, listings.length)} / ${listings.length} listings... (Success: ${successCount}, Skipped: ${skipCount}, Failed: ${failCount})`);
  }

  console.log(`\nImport Complete!`);
  console.log(`Total listings: ${listings.length}`);
  console.log(`Successfully imported: ${successCount}`);
  console.log(`Skipped (Duplicates/Missing Seller): ${skipCount}`);
  console.log(`Failed: ${failCount}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
