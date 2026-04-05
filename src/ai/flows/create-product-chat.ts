// Legacy Genkit flow stub - replaced by src/lib/ai/openai.ts
// Used by: src/components/product-chat.tsx

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createProductChat(_input: any) {
  console.warn('[LEGACY] createProductChat() - use chatWithProducts() from @/lib/ai/openai');
  return {
    response: 'This feature is being upgraded. Please try again later.',
    productName: undefined as string | undefined,
    description: undefined as string | undefined,
    price: undefined as number | undefined,
  };
}
