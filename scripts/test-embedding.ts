import OpenAI from "openai";

const ollamaClient = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1",
  apiKey: "ollama", // Required by OpenAI SDK but ignored by Ollama
});

async function main() {
  const model = "nomic-embed-text";
  const samples = [
    "Hello world",
    "This is a longer sentence describing a beautiful car for sale.",
    "A completely different topic about electronics."
  ];

  console.log(`Testing embeddings with model: ${model}`);
  console.log("-----------------------------------------");

  for (let i = 0; i < samples.length; i++) {
    try {
      const response = await ollamaClient.embeddings.create({
        model,
        input: samples[i],
      });
      const embedding = response.data[0].embedding;
      console.log(`Sample ${i + 1}:`);
      console.log(`Input: "${samples[i]}"`);
      console.log(`Dimension: ${embedding.length}`);
      console.log(`First 3 values: [${embedding.slice(0, 3).join(", ")}...]`);
      console.log("-----------------------------------------");
    } catch (e) {
      console.error(`Error with sample ${i + 1}:`, e);
    }
  }
}

main().catch(console.error);
