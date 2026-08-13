import axios from 'axios';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamOptions {
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

export async function* streamChat(
  model: string,
  messages: OllamaMessage[],
  options: StreamOptions = {},
  signal?: AbortSignal
) {
  try {
    const response = await axios({
      method: 'post',
      url: `${OLLAMA_URL}/api/chat`,
      data: {
        model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature,
          num_predict: options.max_tokens,
          ...options
        }
      },
      responseType: 'stream',
      signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    let buffer = '';
    for await (const chunk of response.data) {
      if (signal?.aborted) break;

      const chunkStr = chunk.toString();
      // console.log(`[Ollama Service] Raw chunk received (${chunkStr.length} chars)`);
      
      buffer += chunkStr;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // Keep the incomplete line in the buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const token = parsed.message?.content ?? "";
          const done = parsed.done || false;
          
          yield { token, done };
        } catch (e) {
          // If JSON parse fails, we might have a line problem, but buffer management should prevent partial JSON
          console.error('Failed to parse Ollama JSON line:', line);
        }
      }
    }
  } catch (error: any) {
    if (axios.isCancel(error) || error.name === 'AbortError') {
      return;
    }
    console.error('Ollama Service Error:', error.response?.data || error.message);
    yield { error: error.message || 'Ollama connection failed' };
  }
}

export async function getModels() {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    return response.data.models || [];
  } catch (error: any) {
    console.error('Fetch Models Error:', error.message);
    throw new Error('Could not fetch models from Ollama');
  }
}
