const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL!;
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";

async function main() {
  const model = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
  const samples = [
    "Hello world",
    "This is a longer sentence describing a beautiful car for sale.",
    "A completely different topic about electronics."
  ];

  console.log(`Testing embeddings with model: ${model}`);
  console.log(`Endpoint: ${OLLAMA_BASE_URL}/api/embeddings`);
  console.log("-----------------------------------------");

  for (let i = 0; i < samples.length; i++) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": OLLAMA_API_KEY,
        },
        body: JSON.stringify({
          model,
          prompt: samples[i],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const embedding = data.embedding as number[];
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
