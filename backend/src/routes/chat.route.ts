import { FastifyInstance } from 'fastify';
import { chatService } from '../services/chat.service';

export default async function chatRoutes(fastify: FastifyInstance) {
  // Get all chats
  fastify.get('/chats', async () => {
    return chatService.getAllChats();
  });

  // Get specific chat
  fastify.get('/chats/:id', async (request: any, reply) => {
    const chat = chatService.getChat(request.params.id);
    if (!chat) return reply.status(404).send({ error: 'Chat not found' });
    return chat;
  });

  // Save chat
  fastify.post('/chats', async (request: any, reply) => {
    try {
      chatService.upsertChat(request.body);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(`[UpsertChat Error] ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete chat
  fastify.delete('/chats/:id', async (request: any) => {
    chatService.deleteChat(request.params.id);
    return { success: true };
  });

  // Save message
  fastify.post('/messages', async (request: any, reply) => {
    try {
      chatService.upsertMessage(request.body);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(`[UpsertMessage Error] ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Clear messages
  fastify.delete('/chats/:id/messages', async (request: any) => {
    chatService.clearMessages(request.params.id);
    return { success: true };
  });

  // --- STREAMING PROXY ---
  fastify.post('/chat/stream', async (request: any, reply) => {
    const { model, messages, options } = request.body || {};
    const rawCtx = Number(options?.num_ctx) || 8192;
    const safeCtx = rawCtx > 32768 ? 16384 : rawCtx;
    console.log(`[Backend Proxy] Request for ${model} with num_ctx: ${safeCtx} (requested: ${options?.num_ctx})`);

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          options: { ...options, num_ctx: safeCtx },
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        let errMessage = `Ollama returned HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {
          const text = await response.text().catch(() => '');
          if (text) errMessage = text;
        }
        console.error(`[Ollama Proxy Error] Status ${response.status}: ${errMessage}`);
        return reply.status(response.status || 500).send({ error: errMessage });
      }

      // MANUALLY ADD CORS HEADERS FOR THE RAW STREAM
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            reply.raw.write(`data: ${JSON.stringify({
              token: parsed.message?.content || '',
              done: parsed.done || false
            })}\n\n`);
          } catch (e) {}
        }
      }

      reply.raw.end();
    } catch (error) {
      console.error('[Stream Error]', error);
      // Ensure we haven't already started writing headers
      if (!reply.raw.headersSent) {
        reply.status(500).send({ error: 'Streaming failed' });
      } else {
        reply.raw.end();
      }
    }
  });

  // --- NON-STREAMING PROXY (for Vision handover, etc) ---
  fastify.post('/chat', async (request: any, reply) => {
    const { model, messages, options } = request.body;
    console.log(`[Backend Proxy] Non-streaming request for ${model}`);

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          options,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('[Proxy Error]', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // --- STREAMING PULL PROXY (for model pulling) ---
  fastify.post('/pull', async (request: any, reply) => {
    const { model } = request.body;
    console.log(`[Backend Proxy] Pull request for ${model}`);

    try {
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, stream: true }),
      });

      if (!response.ok || !response.body) {
        return reply.status(response.status).send({ error: `Ollama error: ${response.statusText}` });
      }

      reply.raw.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply.raw.write(decoder.decode(value, { stream: true }));
      }
      reply.raw.end();
    } catch (error: any) {
      console.error('[Proxy Pull Error]', error);
      return reply.status(500).send({ error: error.message });
    }
  });
}
