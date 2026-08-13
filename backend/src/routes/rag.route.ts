import { FastifyInstance } from 'fastify';
import { ragService } from '../services/rag.service';

export default async function ragRoutes(fastify: FastifyInstance) {
  // Trigger project indexing
  fastify.post('/rag/index', async (request, reply) => {
    // We run indexing in the background as it can take time
    ragService.indexProject((current, total, file) => {
      // We could use WebSockets for real-time progress, 
      // but for now we'll just log it.
      console.log(`[RAG Indexing] ${current}/${total}: ${file}`);
    }).catch(err => {
      console.error('[RAG Indexing Error]', err);
    });

    return { status: 'started' };
  });

  // Semantic search
  fastify.post('/rag/search', async (request: any) => {
    const { query, limit } = request.body;
    const results = await ragService.search(query, limit);
    return { results };
  });

  // Clear project index
  fastify.delete('/rag/index', async () => {
    const { chatService } = await import('../services/chat.service');
    chatService.clearProjectIndex();
    return { success: true };
  });
}
