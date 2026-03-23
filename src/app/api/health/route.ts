// Health Check API Endpoint
// Tests connectivity to all services: PostgreSQL, Qdrant, S3, OpenAI

import { NextResponse } from 'next/server';
import os from 'os';
import { checkDatabaseConnection } from '@/lib/db/prisma';
import { checkQdrantConnection } from '@/lib/qdrant/client';
import { checkS3Connection } from '@/lib/s3/client';
import { checkOpenAIConnection } from '@/lib/ai/ai-service';

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: ServiceStatus;
    vectorDb: ServiceStatus;
    storage: ServiceStatus;
    ai: ServiceStatus;
  };
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    platform: string;
  };
}

async function checkService(
  name: string,
  checker: () => Promise<boolean>
): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const isHealthy = await checker();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  // Check all services in parallel
  const [database, vectorDb, storage, ai] = await Promise.all([
    checkService('database', checkDatabaseConnection),
    checkService('vectorDb', checkQdrantConnection),
    checkService('storage', checkS3Connection),
    checkService('ai', checkOpenAIConnection),
  ]);

  // Determine overall status
  const services = { database, vectorDb, storage, ai };
  const statuses = Object.values(services).map((s) => s.status);

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (statuses.every((s) => s === 'healthy')) {
    overallStatus = 'healthy';
  } else if (statuses.some((s) => s === 'healthy')) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'unhealthy';
  }

  const health: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services,
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: os.platform(),
    },
  };

  return NextResponse.json(health, {
    status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503,
  });
}
