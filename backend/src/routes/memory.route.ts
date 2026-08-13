import { FastifyInstance } from 'fastify';
import { getMemories, addMemory, deleteMemory } from '../services/memory.service.js';

export default async function memoryRoutes(fastify: FastifyInstance) {
  // Get all memories
  fastify.get('/', async () => {
    return await getMemories();
  });

  // Add a new memory manually
  fastify.post('/', async (request, reply) => {
    const { content } = request.body as { content: string };
    if (!content) return reply.code(400).send({ error: 'Content is required' });
    return await addMemory(content);
  });

  // Delete a memory
  fastify.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await deleteMemory(id);
    return { success: true };
  });
}
