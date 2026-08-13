import fs from 'fs';
import path from 'path';
import { chatService } from './chat.service';

// Simple vector similarity helper (Cosine Similarity)
function cosineSimilarity(v1: number[], v2: number[]) {
  if (!v1 || !v2 || v1.length === 0 || v1.length !== v2.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    mA += v1[i] * v1[i];
    mB += v2[i] * v2[i];
  }
  if (mA === 0 || mB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
  return isNaN(sim) ? 0 : sim;
}

export class RagService {
  private isIndexing = false;
  private projectPath: string = process.cwd();

  /**
   * Scan project and index files
   */
  async indexProject(onProgress?: (current: number, total: number, file: string) => void) {
    if (this.isIndexing) return;
    this.isIndexing = true;

    try {
      const files = this.getAllFiles(this.projectPath);
      const total = files.length;
      
      console.log(`[RAG] Starting indexing of ${total} files...`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = path.relative(this.projectPath, file);
        
        if (onProgress) onProgress(i + 1, total, relativePath);

        try {
          const content = fs.readFileSync(file, 'utf-8');
          if (content.length > 50000) continue; // Skip massive files

          // Chunking (Simple for now: by function/block or fixed size)
          const chunks = this.chunkText(content, 1000);
          
          for (const chunk of chunks) {
            const embedding = await this.getEmbedding(chunk);
            if (embedding) {
              // Store in SQLite (We'll add a table for this)
              this.storeChunk(relativePath, chunk, embedding);
            }
          }
        } catch (e) {
          console.warn(`[RAG] Failed to index ${relativePath}`, e);
        }
      }
    } finally {
      this.isIndexing = false;
    }
  }

  async clearIndex() {
    chatService.clearProjectIndex();
  }

  private getAllFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    const ignore = ['.git', 'node_modules', 'dist', 'build', '.next', 'out', 'package-lock.json'];

    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (ignore.includes(file)) return;

      if (fs.statSync(filePath).isDirectory()) {
        this.getAllFiles(filePath, fileList);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.c', '.cpp', '.md', '.txt', '.css', '.html'].includes(ext)) {
          fileList.push(filePath);
        }
      }
    });
    return fileList;
  }

  private chunkText(text: string, size: number): string[] {
    const chunks: string[] = [];
    
    // Split by structural code boundaries (functions, classes, exports, interfaces)
    const blocks = text.split(/\n(?=(?:export\s+)?(?:function|class|interface|type|const|let|var|def|public|private|async)\s+)/g);
    
    let currentChunk = '';
    
    for (const block of blocks) {
      if ((currentChunk + block).length <= size) {
        currentChunk += (currentChunk ? '\n' : '') + block;
      } else {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        // Handle huge single blocks by slicing
        if (block.length > size) {
          let start = 0;
          const step = Math.max(1, size - 100);
          while (start < block.length) {
            chunks.push(block.slice(start, start + size));
            start += step;
          }
          currentChunk = '';
        } else {
          currentChunk = block;
        }
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  private async getEmbedding(text: string): Promise<number[] | null> {
    try {
      const res = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text,
        }),
      });
      const data = await res.json();
      return data.embedding;
    } catch (e) {
      return null;
    }
  }

  private storeChunk(filePath: string, content: string, embedding: number[]) {
    // We'll implement this using chatService or a direct DB call
    // Storing as JSON string in SQLite for simplicity in this local setup
    chatService.saveFileChunk(filePath, content, JSON.stringify(embedding));
  }

  async search(query: string, limit = 5) {
    const queryEmbedding = await this.getEmbedding(query);
    if (!queryEmbedding) return [];

    const allChunks = chatService.getAllFileChunks();
    const results = allChunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, JSON.parse(chunk.embedding))
    }));

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export const ragService = new RagService();
