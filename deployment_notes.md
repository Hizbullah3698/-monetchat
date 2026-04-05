# Monetchat - Local AI Deployment Notes

## Required Services
For Monetchat to operate with its AI features fully functional locally, the following background services must be persistently running:
1. **Ollama Daemon**: Hosts the offline Language and Visual models. (Default port: `11434`)
2. **Qdrant Vector DB**: Handles robust semantic and vector search indexing. (Default port: `6333`)
3. **PostgreSQL**: Primary relational database. (Default port: `5432`)
4. **Node.js**: The Next.js monolithic production process. (Requires `npm run build` and `npm start`)

## Required Ollama Models
Ensure you run the following commands via your terminal to download/update the required local models into Ollama:
```sh
ollama pull llama3.1:8b
ollama pull nomic-embed-text
ollama pull llava
```

## Environment Variables (.env)
The `.env` file must cleanly include the local configurations to avoid relying on external routing.
```env
EMBEDDING_PROVIDER=ollama
CHAT_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=llama3.1:8b
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_VISION_MODEL=llava
# Optional for Audio Voice notes only
GROQ_API_KEY=your_key_here 
```

## Startup Commands
If you are managing the server from a fresh reboot, make sure services are online:
1. Next.js: `npm run build && npm start` or use PM2 `pm2 start npm --name "monetchat" -- start`
2. Qdrant: Hosted typically via Docker (`docker-compose up -d`)
3. Ollama: If running natively on Windows, it typically starts on boot.

## Database Vector Sync (Re-indexing)
If you recreate the database or wipe vectors, you must manually run the re-indexing command to regenerate embedding profiles locally via `nomic-embed-text`.
```sh
npx tsx scripts/reindex-qdrant.ts
```

## Troubleshooting
- **404 Endpoint Not Found** (Chat / Re-indexing): Make sure the `OLLAMA_BASE_URL` ends with `/v1` internally within the `OpenAI` client initialization in `openai.ts` if running into OpenAI compat layer bugs, or simply configure the base URL directly in the script appropriately. *(Already solved in current stack).*
- **Missing Embeddings/Empty Search Results**: Ensure `VECTOR_SIZE = 768` is firmly set across `qdrant/client.ts` and `reindex-qdrant.ts` if vectors mismatch.
- **Ollama Offline**: Keep an eye on system RAM. Running all 3 models contextually can utilize ~8-12GB of VRAM/RAM.
