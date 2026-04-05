// Legacy database compatibility shim
// Routes still importing from @/lib/db should be migrated to use @/lib/db/prisma
// This file provides stub exports to prevent build failures

// Stub sql types for legacy MSSQL-style queries
export const sql = {
  UniqueIdentifier: 'UniqueIdentifier' as const,
  NVarChar: 'NVarChar' as const,
  Int: 'Int' as const,
  Bit: 'Bit' as const,
  Decimal: 'Decimal' as const,
  DateTime: 'DateTime' as const,
};

// Stub query function - always returns empty results
// Legacy routes using this will return empty data until migrated to Prisma
export async function query(
  _queryString: string,
  _params?: Array<{ name: string; value: unknown; type: string }>
): Promise<{ recordset: Array<Record<string, unknown>>; rowsAffected: number[] }> {
  console.warn('[LEGACY] query() called from @/lib/db - this route needs migration to Prisma');
  return {
    recordset: [],
    rowsAffected: [0],
  };
}
