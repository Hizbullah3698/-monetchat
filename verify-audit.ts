import { prisma } from './src/lib/db/prisma';
import { AuditLogService } from './src/lib/services/audit-service';

async function main() {
  console.log('Testing AuditLogService...');
  
  await AuditLogService.logAction({
    userId: null,
    action: 'CREATE',
    entityName: 'TestEntity',
    entityId: 'test-123',
    changes: { foo: 'bar' },
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent/1.0',
  });

  const logs = await prisma.auditLog.findMany({
    where: { entityId: 'test-123' },
  });

  console.log(`Found ${logs.length} audit logs:`);
  console.log(logs);

  if (logs.length > 0) {
    console.log('AuditLogService works!');
    // Cleanup
    await prisma.auditLog.deleteMany({
      where: { entityId: 'test-123' },
    });
  } else {
    console.log('No logs found. AuditLogService failed.');
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
