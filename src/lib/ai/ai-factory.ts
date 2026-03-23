import { AiProvider } from "./providers/ai-provider.interface";
import { OllamaProvider } from "./providers/ollama.provider";
import { OpenAiProvider } from "./providers/openai.provider";

/**
 * Factory class to instantiate and provide the active AI provider.
 */
export class AiFactory {
  private static instance: AiProvider | null = null;

  /**
   * Retrieves the configured AiProvider singleton.
   * Based on the AI_PROVIDER environment variable ('ollama' or 'openai').
   */
  public static getProvider(): AiProvider {
    if (!this.instance) {
      const providerType = (process.env.AI_PROVIDER || "ollama").toLowerCase();

      switch (providerType) {
        case "openai":
          console.log("[AI Factory] Initializing OpenAiProvider");
          this.instance = new OpenAiProvider();
          break;
        case "ollama":
        default:
          console.log("[AI Factory] Initializing OllamaProvider");
          this.instance = new OllamaProvider();
          break;
      }
    }

    return this.instance;
  }
}
