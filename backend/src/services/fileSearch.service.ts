import fs from 'fs/promises';
import path from 'path';

export interface FileMatch {
  path: string;
  name: string;
  content: string;
}

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.gemini', 'package-lock.json'];
const ALLOWED_EXTS = ['.ts', '.js', '.tsx', '.jsx', '.py', '.json', '.md', '.css', '.html'];

/**
 * Enhanced search for Windows/POSIX paths and project keywords.
 */
export async function searchLocalFiles(query: string, rootDir: string = process.cwd()): Promise<FileMatch[]> {
  const matches: FileMatch[] = [];
  const projectRoot = path.resolve(rootDir, '..');
  
  const normalizedQuery = query.replace(/\\/g, '/');
  
  const potentialPaths: string[] = [];
  const pathRegex = /([a-zA-Z]:[^\s]+\.[a-z]+)|([^\s]+\/[^\s]+\.[a-z]+)/gi;
  let m;
  while ((m = pathRegex.exec(normalizedQuery)) !== null) {
    potentialPaths.push(m[0]);
  }

  const keywords = normalizedQuery.split(/[ \/]/).filter(k => k.includes('.') || k.length > 3);

  // 1. Direct Path Check
  for (const p of potentialPaths) {
    try {
      const pathsToTry = [path.resolve(p), path.resolve(projectRoot, p)];
      for (const fullPath of pathsToTry) {
        try {
          const stats = await fs.stat(fullPath);
          if (stats.isFile()) {
            const content = await fs.readFile(fullPath, 'utf-8');
            matches.push({
              path: path.relative(projectRoot, fullPath).replace(/\\/g, '/'),
              name: path.basename(fullPath),
              content: content // NO LIMIT - User has 64k context
            });
            break;
          }
        } catch {}
      }
    } catch {}
  }

  // 2. Recursive Search
  if (matches.length < 3) {
    async function walk(dir: string) {
      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relPath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
        if (file.isDirectory()) {
          if (!IGNORE_DIRS.includes(file.name)) await walk(fullPath);
          continue;
        }
        if (!ALLOWED_EXTS.includes(path.extname(file.name))) continue;
        const lowerName = file.name.toLowerCase();
        const isMatch = keywords.some(k => k.toLowerCase() === lowerName || relPath.toLowerCase().endsWith(k.toLowerCase()));
        if (isMatch) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            matches.push({ path: relPath, name: file.name, content: content });
          } catch {}
        }
        if (matches.length >= 10) break;
      }
    }
    try { await walk(projectRoot); } catch { await walk(rootDir); }
  }

  const unique = Array.from(new Map(matches.map(m => [m.path, m])).values());
  return unique;
}
