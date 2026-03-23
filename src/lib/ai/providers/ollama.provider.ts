import OpenAI from "openai";
import { AiProvider } from "./ai-provider.interface";

export class OllamaProvider implements AiProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL}/v1` : "http://127.0.0.1:11434/v1",
      apiKey: "ollama", // Required by OpenAI SDK but ignored by Ollama
      timeout: 120000,
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
    return process.env.OLLAMA_CHAT_MODEL || "llama3.1:8b";
  }

  getDefaultVisionModel(): string {
    return process.env.OLLAMA_VISION_MODEL || "llava";
  }

  getDefaultEmbeddingModel(): string {
    return process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
  }
}
