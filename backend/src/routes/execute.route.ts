import { FastifyInstance } from 'fastify';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const execPromise = promisify(exec);

export default async function executeRoutes(fastify: FastifyInstance) {
  fastify.post('/execute', async (request: any, reply) => {
    const { language, code } = request.body;

    if (!language || !code) {
      return reply.status(400).send({ error: 'Language and code are required' });
    }

    const id = randomUUID();
    const execDir = join(tmpdir(), `privac-exec-${id}`);
    let tempFileName = `script`;
    let command = '';

    const lang = language.toLowerCase();

    switch (lang) {
      case 'javascript':
      case 'js':
        tempFileName += '.js';
        command = `node "${tempFileName}"`;
        break;
      
      case 'typescript':
      case 'ts':
        tempFileName += '.ts';
        command = `npx tsx "${tempFileName}"`;
        break;

      case 'python':
      case 'py':
        tempFileName += '.py';
        command = `python "${tempFileName}" || python3 "${tempFileName}"`;
        break;

      case 'java':
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : 'Main';
        tempFileName = className + '.java';
        command = `javac "${tempFileName}" && java "${className}"`;
        break;

      default:
        return reply.status(400).send({ error: `Language "${language}" is not supported for execution yet.` });
    }

    const tempFilePath = join(execDir, tempFileName);

    try {
      await mkdir(execDir, { recursive: true });
      await writeFile(tempFilePath, code);

      const { stdout, stderr } = await execPromise(command, {
        cwd: execDir,
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });

      return {
        success: true,
        output: stdout,
        error: stderr,
      };
    } catch (err: any) {
      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || err.message || 'Execution failed',
        timedOut: !!err.killed,
      };
    } finally {
      try {
        await rm(execDir, { recursive: true, force: true });
      } catch (e) {}
    }
  });
}
