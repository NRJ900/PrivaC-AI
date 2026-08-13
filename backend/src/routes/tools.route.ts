import { FastifyInstance } from 'fastify';
import { searchWeb } from '../services/search.service.js';

export default async function toolsRoutes(fastify: FastifyInstance) {
  fastify.post('/search', async (request, reply) => {
    const { query } = request.body as { query: string };
    console.log(`[Backend API] Received search request for: "${query}"`);
    
    if (!query) {
      return reply.code(400).send({ error: 'Query is required' });
    }

    try {
      const results = await searchWeb(query);
      return { results };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
