// Legacy Genkit flow stub - replaced by src/lib/ai/openai.ts
// Used by: src/components/similar-products-chat.tsx

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface VisionChatInput {
  imageUrl?: string;
  message?: string;
  history?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function visionChat(_input: any) {
  console.warn('[LEGACY] visionChat() - use processImageForSearch() from @/lib/ai/openai');
  return {
    response: 'This feature is being upgraded. Please try again later.',
    products: [] as unknown[],
  };
}
