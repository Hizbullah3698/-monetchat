// Reviews API
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { productId, rating, comment } = await request.json();
    return NextResponse.json({
      message: 'Review submitted',
      review: { productId, rating, comment, userId: user.userId },
    });
  } catch (error) {
    console.error('Review Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ reviews: [] });
  return NextResponse.json({ reviews: [] });
}
