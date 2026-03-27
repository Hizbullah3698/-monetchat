import OpenAI from "openai";
import { AiProvider } from "./ai-provider.interface";

export class OpenAiProvider implements AiProvider {
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is not set. OpenAiProvider will fail if called.");
    }
    
    this.client = new OpenAI({
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      apiKey: process.env.OPENAI_API_KEY || "missing-key",
      timeout: 60000,
    });
  }

  async createChatCompletion(
    options: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, "stream">
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    return this.client.chat.completions.create({
      ...options,
      stream: false,
    });
  }

  async createChatCompletionStream(
    options: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming, "stream">
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const stream = await this.client.chat.completions.create({
      ...options,
      stream: true,
    });
    return stream;
  }

  async createEmbedding(text: string, model?: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: model || this.getDefaultEmbeddingModel(),
      input: text,
    });
    return response.data[0].embedding;
  }

  getDefaultChatModel(): string {
    return process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  }

  getDefaultVisionModel(): string {
    return process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  }

  getDefaultEmbeddingModel(): string {
    return process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
  }
}
