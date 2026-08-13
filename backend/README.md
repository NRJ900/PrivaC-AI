# Ollama Private Proxy Backend

A Fastify-based backend that provides a standardized SSE streaming interface for local LLM inference via Ollama.

## Features

- **SSE Streaming**: Standardizes Ollama responses for frontend consumption.
- **Abort Handling**: Properly cancels upstream Ollama requests on client disconnect.
- **Model Metadata**: Provides a simplified view of installed local models.
- **Performance**: Built with Fastify for low overhead and horizontal scalability.

## Quick Start

```bash
npm install
npm run dev
```

## Endpoints

- `POST /api/chat/stream`: Stream chat tokens via SSE.
- `GET /api/models`: List installed models.
- `GET /api/health`: Health check (proxies to models list).
