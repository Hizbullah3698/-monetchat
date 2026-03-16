

async function testEmbedding() {
  const url = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";
  const inputs = "This is a test product about an iPhone";
  
  console.log("Testing URL:", url);
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: inputs })
    });
    
    if (!res.ok) {
      console.log("Error:", res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log("Success! Returned embedding type:", Array.isArray(data) ? "Array" : typeof data);
    console.log("Dimensionality:", Array.isArray(data) ? data.length : "N/A");
  } catch(e) {
    console.log("Exception:", e);
  }
}

testEmbedding();
