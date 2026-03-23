
import { NextResponse } from 'next/server';

/**
 * @openapi
 * /api/ai/vision-chat:
 *   post:
 *     summary: Chat with AI vision model about an image
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: AI response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *       500:
 *         description: AI Error
 */
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
