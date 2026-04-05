# Local Development Setup

## Prerequisites
- Docker Desktop installed and running
- Ollama installed: https://ollama.com/download

## 1. Start infrastructure
docker compose up -d postgres qdrant redis

## 2. Start Ollama
ollama serve

## 3. Pull models (first time only)
ollama pull qwen2.5:14b-instruct-q8_0
ollama pull nomic-embed-text
ollama pull llava:latest

## 4. Setup database and start app
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev

## 5. Index products in Qdrant
npm run qdrant:reindex

## Services
- App:      http://localhost:9002
- Postgres: localhost:5432
- Qdrant:   http://localhost:6333
- Redis:    localhost:6379
- Ollama:   http://localhost:11434
