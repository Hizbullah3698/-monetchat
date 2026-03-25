fetch('http://localhost:9002/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: "hello test", session_id: "test-session", language: "en" })
}).then(async res => {
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}).catch(console.error);
