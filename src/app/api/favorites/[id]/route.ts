// Favorites API
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await context.params;
    return NextResponse.json({ message: 'Added to favorites', productId: id });
  } catch (error) {
    console.error('Favorites API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await context.params;
    return NextResponse.json({ message: 'Removed from favorites', productId: id });
  } catch (error) {
    console.error('Favorites API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await context.params;
    return NextResponse.json({ isFavorited: false });
  } catch {
    return NextResponse.json({ isFavorited: false });
  }
}
