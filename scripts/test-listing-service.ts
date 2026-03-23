
import { prisma } from '../src/lib/db/prisma';
import { ListingService } from '../src/lib/services/listing-service';
import { ProductCondition, ProductStatus } from '@prisma/client';

async function test() {
  console.log('--- Starting ListingService Test ---');

  let user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found, creating test user...');
    // Create a role first if needed
    const role = await prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: { name: 'user', description: 'Standard user' }
    });

    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed_password',
        roleId: role.id,
        countryCode: 'KW',
      }
    });
  }
  const userId = user.id;

  // Ensure seller exists
  await prisma.seller.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      phonePublic: '12345678',
      businessName: 'Test Business',
    },
  });

  // 2. Create Listing
  console.log('Creating listing...');
  const newProduct = await ListingService.createListing(userId, {
    title: 'Test Product ' + Date.now(),
    price: 99.99,
    description: 'This is a test product description with enough length.',
    condition: ProductCondition.new,
    countryCode: 'KW',
    currency: 'KWD',
    isNegotiable: true,
    images: [{
      url: 'https://example.com/image.jpg',
      s3Key: 'test/image.jpg',
      isPrimary: true,
      sortOrder: 0,
    }],
  });
  console.log('Created:', newProduct.id, 'Status:', newProduct.status);

  // 3. Update Status (Mark as Sold)
  console.log('Marking as sold...');
  const soldProduct = await ListingService.updateStatus(userId, newProduct.id, {
    status: ProductStatus.sold,
  });
  console.log('Status updated to:', soldProduct.status);

  // 4. Update Listing
  console.log('Updating listing...');
  const updatedProduct = await ListingService.updateListing(userId, newProduct.id, {
    title: 'Updated Title',
    price: 109.99,
  });
  console.log('Updated Title:', updatedProduct.title, 'Price:', updatedProduct.price);

  // 5. Soft Delete
  console.log('Deleting listing...');
  const deletedProduct = await ListingService.deleteListing(userId, newProduct.id);
  console.log('Deleted flag (deletedAt):', deletedProduct.deletedAt);

  // 6. Verify fetch
  console.log('Verifying fetch (should be null due to deletedAt)...');
  const fetchedProduct = await ListingService.getListing(newProduct.id);
  console.log('Fetched Product (is null):', fetchedProduct === null);

  console.log('--- Test Completed Successfully ---');
}

test()
  .catch(e => {
    console.error('Test Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
