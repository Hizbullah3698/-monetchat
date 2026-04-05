
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();

        // Simulating AI Response
        await new Promise(r => setTimeout(r, 1000));

        return NextResponse.json({
            text: "Based on the image, the item appears to be in good condition. The leather shows some natural patina but no major scratches."
        });

    } catch (error) {
        return NextResponse.json({ error: 'AI Error' }, { status: 500 });
    }
}
