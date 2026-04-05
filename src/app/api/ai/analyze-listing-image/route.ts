// POST /api/ai/analyze-listing-image - Analyze uploaded image for seller listing
// Returns AI-suggested title, description, category, price

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { analyzeImageForListing } from '@/lib/ai/openai';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { image_url } = body;

    if (!image_url) {
      return NextResponse.json(
        { error: 'image_url is required' },
        { status: 400 }
      );
    }

    const analysis = await analyzeImageForListing(image_url, 'KW');

    return NextResponse.json({
      title: analysis.title,
      title_ar: analysis.title_ar,
      description: analysis.description,
      description_ar: analysis.description_ar,
      category: analysis.category,
      suggested_price: analysis.suggested_price,
    });
  } catch (error) {
    console.error('Analyze listing image error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
