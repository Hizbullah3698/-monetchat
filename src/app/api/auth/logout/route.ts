/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 *     description: Invalidates the user's refresh token and clears the cookie.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { AuditLogService } from '@/lib/services/audit-service';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (refreshToken) {
      // Invalidate token in database
      const tokenRecord = await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      }).catch(() => null);
      
      if (tokenRecord) {
        await AuditLogService.logAction({
          userId: tokenRecord.userId,
          action: 'LOGOUT',
          entityName: 'User',
          entityId: tokenRecord.userId,
          ipAddress: req.headers.get('x-forwarded-for') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        });
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    // Clear cookie
    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
