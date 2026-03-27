import { NextRequest } from "next/server";
import { AiFactory as AiProviderFactory } from "@/lib/ai/ai-factory";

function normalizeMessages(input: unknown): Array<{ role: string; content: string }> {
  if (!Array.isArray(input)) return [];
  const out: Array<{ role: string; content: string }> = [];

  for (const m of input) {
    if (!m || typeof m !== "object") continue;
    const role = (m as any).role;
    const content = (m as any).content;
    if (typeof role !== "string") continue;
    if (typeof content !== "string") continue;
    out.push({ role, content });
  }

  return out;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as any));

  const messages =
    normalizeMessages((body as any).messages).length > 0
      ? normalizeMessages((body as any).messages)
      : [
          {
            role: "user",
            content: String((body as any).message ?? ""),
          },
        ];

  const provider = AiProviderFactory.getProvider() as any;
  const stream = await provider.createChatCompletionStream({ messages });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
