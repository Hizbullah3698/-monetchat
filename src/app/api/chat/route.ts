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
  
  if (process.env.AI_PROVIDER === "ollama" || !process.env.AI_PROVIDER) {
    const stream = (await provider.createChatCompletionStream({ messages })) as ReadableStream;
    
    let buffer = '';
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        buffer += new TextDecoder().decode(chunk);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line) continue;
          try {
            const data = JSON.parse(line);
            if (data.message && data.message.content) {
              const payload = JSON.stringify({ content: data.message.content });
              controller.enqueue(new TextEncoder().encode(`event: delta\ndata: ${payload}\n\n`));
            }
            if (data.done) {
              const payload = JSON.stringify({ session_id: body.session_id || "tmp-" + Date.now() });
              controller.enqueue(new TextEncoder().encode(`event: done\ndata: ${payload}\n\n`));
            }
          } catch (e) {
            // ignore partial json
          }
        }
      }
    });

    return new Response(stream.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });
  } else {
    const stream = (await provider.createChatCompletionStream({ messages })) as AsyncIterable<any>;
    
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            const payload = JSON.stringify({ content });
            controller.enqueue(new TextEncoder().encode(`event: delta\ndata: ${payload}\n\n`));
          }
        }
        const payload = JSON.stringify({ session_id: body.session_id || "tmp-" + Date.now() });
        controller.enqueue(new TextEncoder().encode(`event: done\ndata: ${payload}\n\n`));
        controller.close();
      }
    });
    
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });
  }
}
