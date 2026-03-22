import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();
  const porscheCount = await prisma.product.count({
    where: {
      OR: [
        { title: { contains: 'Porsche', mode: 'insensitive' } },
        { title: { contains: 'بي ام دبليو', mode: 'insensitive' } }
      ]
    }
  });

  const latestProducts = await prisma.product.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { title: true, price: true }
  });

  console.log(`Total Products: ${count}`);
  console.log(`Porsche/BMW Count: ${porscheCount}`);
  console.log('Latest Products:');
  console.table(latestProducts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
