import OpenAI from "openai";

export interface AiProvider {
  /**
   * Generates a single chat completion response.
   */
  createChatCompletion(
    options: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, "stream">
  ): Promise<OpenAI.Chat.Completions.ChatCompletion>;

  /**
   * Generates a streaming chat completion response.
   */
  createChatCompletionStream(
    options: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming, "stream">
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>>;

  /**
   * Generates a text embedding.
   */
  createEmbedding(text: string, model?: string): Promise<number[]>;

  /**
   * Gets the name of the default chat model for this provider.
   */
  getDefaultChatModel(): string;

  /**
   * Gets the name of the default vision model for this provider.
   */
  getDefaultVisionModel(): string;

  /**
   * Gets the name of the default embedding model for this provider.
   */
  getDefaultEmbeddingModel(): string;
}
