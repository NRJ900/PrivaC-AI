import { FastifyInstance } from 'fastify';

export default async function modelsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    try {
      // Proxy request to local Ollama
      const res = await fetch('http://localhost:11434/api/tags');
      const data = await res.json();
      return data.models || [];
    } catch (e) {
      // Fallback if Ollama is not running
      return [];
    }
  });
}
