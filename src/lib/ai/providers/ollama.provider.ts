const baseUrl = process.env.OLLAMA_BASE_URL!;
const apiKey = process.env.OLLAMA_API_KEY || "";

export class OllamaProvider {
  async createChatCompletion({ messages }: { messages: any[] }) {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_CHAT_MODEL,
        messages,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama chat failed: ${res.status} ${text}`);
    }

    const data = await res.json();

    return {
      choices: [
        {
          message: {
            content: data.message?.content || "",
          },
        },
      ],
    };
  }

  async createChatCompletionStream({ messages }: { messages: any[] }) {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_CHAT_MODEL,
        messages,
        stream: true,
      }),
    });

    return res.body;
  }

  async createEmbedding(input: string, model?: string) {
    const res = await fetch(`${baseUrl}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: model || process.env.OLLAMA_EMBED_MODEL,
        prompt: input,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Embedding failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    return data.embedding;
  }

  getDefaultChatModel() {
    return process.env.OLLAMA_CHAT_MODEL!;
  }

  getDefaultEmbeddingModel() {
    return process.env.OLLAMA_EMBED_MODEL!;
  }
}
