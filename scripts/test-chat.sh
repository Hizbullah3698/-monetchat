#!/usr/bin/env bash
echo "=== Testing Chat (Qwen 2.5) ==="
curl -X POST http://127.0.0.1:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q8_0",
    "messages": [{"role":"user","content":"Reply with exactly OK"}],
    "stream": false
  }'
echo ""
echo "=== Done ==="
