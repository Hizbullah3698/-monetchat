// Prisma Client Singleton
// Prevents multiple instances in development due to hot reloading

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
  });

prisma.$on('query' as never, (e: Prisma.QueryEvent) => {
  logger.debug({ query: e.query, durationMs: e.duration }, 'Prisma Query');
});

prisma.$on('error' as never, (e: Prisma.LogEvent) => {
  logger.error({ err: e.message }, 'Prisma Error');
});

prisma.$on('warn' as never, (e: Prisma.LogEvent) => {
  logger.warn({ msg: e.message }, 'Prisma Warning');
});

prisma.$on('info' as never, (e: Prisma.LogEvent) => {
  logger.info({ msg: e.message }, 'Prisma Info');
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
