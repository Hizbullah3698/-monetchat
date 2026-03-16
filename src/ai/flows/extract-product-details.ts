// Legacy Genkit flow stub - replaced by src/lib/ai/openai.ts
// Used by: src/components/ai-product-form.tsx

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function extractProductDetails(_input: any) {
  console.warn('[LEGACY] extractProductDetails() - use analyzeImageForListing() from @/lib/ai/openai');
  return {
    productName: '',
    description: '',
    category: '',
    price: 0,
  };
}
