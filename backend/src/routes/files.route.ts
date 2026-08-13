import { FastifyInstance } from 'fastify';
import { createRequire } from 'module';
import { searchLocalFiles } from '../services/fileSearch.service.js';

const require = createRequire(import.meta.url);

export default async function filesRoutes(fastify: FastifyInstance) {
  fastify.post('/search', async (request, reply) => {
    const { query } = request.body as { query: string };
    if (!query) return reply.code(400).send({ error: 'Query is required' });

    console.log(`[File Search] Searching for: "${query}"`);
    const results = await searchLocalFiles(query);
    return { results };
  });

  fastify.post('/parse-pdf', async (request: any, reply) => {
    const { base64 } = request.body || {};
    if (!base64) return reply.code(400).send({ error: 'Base64 data is required' });

    try {
      const buffer = Buffer.from(base64, 'base64');
      let text = '';

      try {
        const pdfParse = require('pdf-parse');
        const parseFn = (pdfParse as any).default || pdfParse;
        if (typeof parseFn === 'function') {
          const parsed = await parseFn(buffer);
          text = parsed?.text || '';
        }
      } catch (pdfErr) {
        console.warn('[PDF-Parse Warning, using stream extraction fallback]', pdfErr);
      }

      // Fallback stream extraction if pdf-parse returned empty or threw an error
      if (!text.trim()) {
        const rawStr = buffer.toString('binary');
        const matches = rawStr.match(/\(([^\)]+)\)\s*T[jJ]/g) || rawStr.match(/[\x20-\x7E\s]{4,}/g) || [];
        text = matches
          .map(m => m.replace(/^\(/, '').replace(/\)\s*T[jJ]$/, ''))
          .filter(b => !b.includes('PDF-') && !b.includes('endobj') && !b.includes('stream') && !b.includes('FontDescriptor') && !b.includes('Catalog'))
          .join(' ');
      }

      return reply.send({ text: text.trim() });
    } catch (e: any) {
      console.error('[PDF Parsing Exception]', e);
      return reply.send({ text: '' });
    }
  });
}
