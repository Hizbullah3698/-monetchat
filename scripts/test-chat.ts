import { chatWithProducts } from "../src/lib/ai/ai-service";

async function main() {
  console.log("=== Testing Chat Flow ===");
  try {
    const chatResponse = await chatWithProducts(
      [{ role: "user", content: "I am looking for a new iPhone under 500 KWD" }],
      {
        country_code: "KW",
        language: "en",
        available_categories: ["electronics", "vehicles"],
      }
    );
    console.log("Chat Response:", JSON.stringify(chatResponse, null, 2));
  } catch(e) {
    console.error("Failed:", e);
  }
}

main().catch(console.dir);
