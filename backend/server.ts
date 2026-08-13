import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';
import chatRoutes from './src/routes/chat.route.js';
import toolsRoutes from './src/routes/tools.route.js';
import memoryRoutes from './src/routes/memory.route.js';
import filesRoutes from './src/routes/files.route.js';
import modelsRoutes from './src/routes/models.route.js';
import executeRoutes from './src/routes/execute.route.js';
import ragRoutes from './src/routes/rag.route.js';

const fastify = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024, // 50MB for vision support
});

// Configure CORS
await fastify.register(cors, {
  origin: '*', // Simplified for local dev search access
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Register Routes
fastify.register(chatRoutes, { prefix: '/api' });
fastify.register(toolsRoutes, { prefix: '/api/tools' });
fastify.register(memoryRoutes, { prefix: '/api/memory' });
fastify.register(filesRoutes, { prefix: '/api/files' });
fastify.register(modelsRoutes, { prefix: '/api/models' });
fastify.register(executeRoutes, { prefix: '/api' });
fastify.register(ragRoutes, { prefix: '/api' });

// Catch-all 404 handler for debugging
fastify.setNotFoundHandler((request, reply) => {
  fastify.log.warn(`404 NOT FOUND: ${request.method} ${request.url}`);
  reply.status(404).send({ error: `Route ${request.method} ${request.url} not found` });
});

const PORT = Number(process.env.PORT) || 3000;

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`\n🚀 Server listening on http://localhost:${PORT}`);
  
  // Log all routes for debugging
  fastify.ready(() => {
    console.log('\n--- Registered Routes ---');
    console.log(fastify.printRoutes());
    console.log('-------------------------\n');
  });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
