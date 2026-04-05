#!/usr/bin/env bash
echo "=== Testing Embeddings (nomic-embed-text) ==="
curl -X POST http://127.0.0.1:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text",
    "prompt": "red flower with green stem"
  }'
echo ""
echo "=== Done ==="
