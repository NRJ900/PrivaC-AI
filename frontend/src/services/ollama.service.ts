import type { OllamaMessage, OllamaChatRequest, StreamChunk, OllamaLocalModel, PullProgressChunk } from '../types';

// ─── Real Ollama API Functions ────────────────────────────────────────────────

/** Check if Backend is running. */
export async function checkOllamaHealth(baseUrl: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    // We'll use the models endpoint as a health check for the proxy
    const res = await fetch(`${baseUrl}/api/models`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return 'connected';
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch list of locally installed models from Backend. */
export async function fetchOllamaModels(baseUrl: string): Promise<OllamaLocalModel[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${baseUrl}/api/models`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data as OllamaLocalModel[];
  } finally {
    clearTimeout(timer);
  }
}

/** Stream a pull progress for a model. Yields PullProgressChunk objects. */
export async function* streamPullModel(
  baseUrl: string,
  modelName: string,
  signal?: AbortSignal
): AsyncGenerator<PullProgressChunk> {
  const res = await fetch(`${baseUrl}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, stream: true }),
    signal,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          yield JSON.parse(trimmed) as PullProgressChunk;
        } catch {
          // skip malformed line
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Real Streaming Chat ──────────────────────────────────────────────────────

export async function* realStreamChat(
  request: OllamaChatRequest,
  baseUrl: string,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const res = await fetch(`${baseUrl}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.ok) {
    let msg = `Proxy error: ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body from Proxy');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.replace(/^data: /, '').trim();
        if (!jsonStr) continue;

        try {
          const chunk = JSON.parse(jsonStr);
          
          if (chunk.error) {
            throw new Error(chunk.error);
          }

          // Convert backend format back to StreamChunk format for chat.store.ts
          yield {
            model: request.model,
            message: { role: 'assistant', content: chunk.token || '' },
            done: chunk.done || false,
          } as StreamChunk;
        } catch (e) {
          if (e instanceof Error) throw e;
          // skip malformed
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function fetchVisionDescription(
  baseUrl: string,
  model: string,
  images: string[],
  prompt: string = 'Describe this image in detail. Focus on text, objects, and layout.',
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt, images }],
      stream: false,
      options: { num_gpu: 99 }
    }),
    signal
  });

  if (!res.ok) throw new Error('Vision analysis failed');
  const data = await res.json();
  return data.message?.content || '';
}

// ─── Mock Response Library ────────────────────────────────────────────────────

const MOCK_RESPONSES: Array<{ keywords: string[]; response: string }> = [
  {
    keywords: ['hello', 'hi', 'hey', 'greet', 'start', 'help', 'what can'],
    response: `Hello! I'm your AI assistant running locally via **Ollama**. 🤖

Here's what I can help you with:

- 💻 **Code** — Write, debug, review, and explain code in any language
- 📖 **Explain** — Break down complex concepts into plain language
- ✍️ **Write** — Draft documents, emails, summaries, and creative content
- 🔍 **Analyze** — Review data, logic, or technical arguments
- 🧮 **Math** — Solve problems step-by-step

**Running locally means:**
- Your conversations stay completely private
- No internet dependency after initial setup
- Fully customizable model settings

What would you like to work on today?`,
  },
  {
    keywords: ['binary search', 'search algorithm', 'algorithm', 'python', 'implement', 'function'],
    response: `Here's a clean, well-documented implementation of binary search in Python:

\`\`\`python
def binary_search(arr: list[int], target: int) -> int:
    """
    Performs binary search on a sorted array.
    
    Args:
        arr: A sorted list of integers
        target: The value to search for
        
    Returns:
        Index of target if found, -1 otherwise
        
    Time: O(log n) | Space: O(1)
    """
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = left + (right - left) // 2  # Avoids integer overflow
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1  # Target not found


# Example usage
data = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

idx = binary_search(data, 11)
print(f"Found at index: {idx}")  # → Found at index: 5

idx = binary_search(data, 4)
print(f"Found at index: {idx}")  # → Found at index: -1
\`\`\`

**Key characteristics:**

- **Time complexity**: O(log n) — halves the search space each step
- **Space complexity**: O(1) — only uses a few variables
- **Prerequisite**: Array must be **sorted** before searching

**When to prefer binary search:**
1. Large datasets (linear search becomes too slow)
2. Frequently repeated lookups on static data
3. Finding insertion points in sorted structures

> 💡 **Tip**: Python's built-in \`bisect\` module provides optimized binary search for production use: \`import bisect; idx = bisect.bisect_left(arr, target)\``,
  },
  {
    keywords: ['react', 'hook', 'fetch', 'useeffect', 'typescript', 'component', 'javascript', 'js', 'ts'],
    response: `Here's a production-ready custom hook for data fetching with full TypeScript support:

\`\`\`typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseFetchOptions {
  immediate?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

function useFetch<T>(
  url: string,
  options: UseFetchOptions = {}
): FetchState<T> & { refetch: () => void; abort: () => void } {
  const { immediate = true, onSuccess, onError } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(url, {
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      const data: T = await response.json();
      setState({ data, loading: false, error: null });
      onSuccess?.(data);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const error = err as Error;
      setState({ data: null, loading: false, error });
      onError?.(error);
    }
  }, [url, onSuccess, onError]);

  useEffect(() => {
    if (immediate) fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData, immediate]);

  return {
    ...state,
    refetch: fetchData,
    abort: () => abortRef.current?.abort(),
  };
}

export default useFetch;
\`\`\`

**Usage example:**

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error, refetch } = useFetch<User>(
    \`/api/users/\${userId}\`,
    {
      onError: (err) => console.error('Fetch failed:', err),
    }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <button onClick={refetch}>Retry: {error.message}</button>;

  return <div>{data?.name}</div>;
}
\`\`\`

This hook automatically **cancels in-flight requests** when the component unmounts or the URL changes — preventing race conditions and memory leaks.`,
  },
  {
    keywords: ['sql', 'nosql', 'database', 'comparison', 'difference', 'when to use'],
    response: `Great question! Here's a comprehensive comparison of SQL and NoSQL databases:

## SQL Databases (Relational)

SQL databases organize data into **tables with predefined schemas** and enforce strict relationships between data.

**Core characteristics:**
- Fixed schema with tables, rows, and columns
- ACID compliance (Atomicity, Consistency, Isolation, Durability)
- Supports complex JOIN operations across tables
- Vertical scaling (bigger hardware)

**Popular options:** PostgreSQL, MySQL, SQLite, Microsoft SQL Server, CockroachDB

---

## NoSQL Databases (Non-Relational)

NoSQL databases use **flexible data models** optimized for specific access patterns.

| Type | Example | Use Case | Strengths |
|------|---------|----------|-----------|
| Document | MongoDB, Firestore | Content, user profiles | Flexible schema, nested data |
| Key-Value | Redis, DynamoDB | Caching, sessions | Extremely fast lookups |
| Wide-Column | Cassandra, HBase | Time-series, analytics | Massive write throughput |
| Graph | Neo4j, ArangoDB | Social networks, recommendations | Complex relationship queries |

---

## Decision Guide

**Choose SQL when:**
1. Data has clear, stable relationships
2. You need complex multi-table queries
3. ACID compliance is non-negotiable (banking, healthcare)
4. Data integrity is the top priority

**Choose NoSQL when:**
1. Schema evolves frequently during development
2. You need horizontal scaling across many servers
3. Handling massive amounts of unstructured data
4. Optimizing for a specific access pattern (e.g., high-speed writes)

---

> 🏗️ **Modern reality**: Most production applications use **both** — SQL for core transactional data and NoSQL (Redis, etc.) for caching, real-time features, or analytics pipelines.`,
  },
  {
    keywords: ['var', 'let', 'const', 'javascript', 'variable', 'scope', 'hoisting'],
    response: `Here's a definitive breakdown of \`var\`, \`let\`, and \`const\` in JavaScript:

## Comparison Table

| Feature | \`var\` | \`let\` | \`const\` |
|---------|---------|---------|---------|
| **Scope** | Function | Block | Block |
| **Hoisting** | Yes (→ \`undefined\`) | Yes (TDZ*) | Yes (TDZ*) |
| **Reassignable** | ✅ | ✅ | ❌ |
| **Re-declarable** | ✅ | ❌ | ❌ |
| **Global property** | Yes | No | No |

> *TDZ = Temporal Dead Zone — accessing before declaration throws \`ReferenceError\`

---

## Code Examples

\`\`\`javascript
// var — function scoped, avoid in modern code
var x = 1;
if (true) {
  var x = 2; // Same variable! Overwrites outer x
}
console.log(x); // 2 — unexpected behavior

// let — block scoped, use for mutable values
let count = 0;
if (true) {
  let count = 99; // Different variable
}
console.log(count); // 0 — expected behavior

// const — block scoped, use for everything else
const PI = 3.14159;
// PI = 3; // ❌ TypeError: Assignment to constant variable

// ⚠️ const doesn't make objects immutable!
const user = { name: 'Alice' };
user.name = 'Bob'; // ✅ This works fine
user = {};         // ❌ This throws an error
\`\`\`

---

**TL;DR:** Use \`const\` by default → \`let\` when you need reassignment → avoid \`var\` entirely.`,
  },
  {
    keywords: ['explain', 'what is', 'how does', 'tell me', 'describe', 'overview'],
    response: `Great question! Let me break this down clearly.

## Understanding the Core Concept

When approaching this topic, it helps to think about it in layers:

**Layer 1: The Foundation**
At its core, the concept builds on simple principles that most developers already know. The complexity comes from combining them in non-obvious ways.

**Layer 2: The Mechanics**

\`\`\`
Input → Processing → Transformation → Output
  ↑                                      ↓
  └──────────── Feedback Loop ───────────┘
\`\`\`

**Layer 3: Real-World Application**

| Scenario | Approach | Tradeoff |
|----------|----------|----------|
| Small scale | Simple implementation | Easier to understand |
| Medium scale | Abstracted modules | Better maintainability |
| Large scale | Distributed architecture | More complexity |

## Key Takeaways

1. **Start simple** — don't over-engineer until you hit actual constraints
2. **Measure first** — profile before optimizing
3. **Document decisions** — future you will thank present you

> 💡 The most elegant solution is usually the one that a junior developer can understand in 5 minutes.

Want me to dive deeper into any specific aspect?`,
  },
];

const DEFAULT_RESPONSE = `I understand your question. Let me think through this carefully.

Based on what you've described, here are the key considerations:

**Approach 1: Direct Solution**

The most straightforward path is to tackle this head-on:

\`\`\`typescript
// Example implementation
function solve(input: string): string {
  const processed = input.trim().toLowerCase();
  
  return processed
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
\`\`\`

**Approach 2: Considered Alternatives**

Before committing, consider these tradeoffs:
- **Performance**: O(n) time, O(n) space
- **Readability**: Clear and maintainable
- **Extensibility**: Easy to add new transformations

**Recommendation**

Given the context, I'd suggest starting with Approach 1 and refactoring if you hit specific constraints.

> Premature optimization is the root of all evil — Donald Knuth

Would you like me to elaborate on any specific part of this solution?`;

function getMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  for (const entry of MOCK_RESPONSES) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.response;
    }
  }
  return DEFAULT_RESPONSE;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Mock Streaming Generator ─────────────────────────────────────────────────

export async function* mockStreamChat(
  messages: OllamaMessage[],
  model: string,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const responseText = getMockResponse(lastUserMsg?.content ?? '');

  const thinkingDelay = 600 + Math.random() * 500;
  await sleep(thinkingDelay);

  if (signal?.aborted) return;

  let buffer = '';
  let totalEmitted = 0;

  for (let i = 0; i < responseText.length; i++) {
    if (signal?.aborted) break;

    buffer += responseText[i];
    const isLast = i === responseText.length - 1;

    const shouldEmit =
      isLast ||
      buffer.length >= 4 + Math.floor(Math.random() * 5) ||
      buffer.endsWith('\n');

    if (shouldEmit) {
      totalEmitted += buffer.length;

      yield {
        model,
        created_at: new Date().toISOString(),
        message: { role: 'assistant', content: buffer },
        done: isLast,
        done_reason: isLast ? 'stop' : undefined,
        ...(isLast
          ? {
              eval_count: Math.ceil(responseText.length / 4),
              total_duration: Math.floor(thinkingDelay * 1_000_000 + totalEmitted * 15_000_000),
            }
          : {}),
      };

      buffer = '';

      const char = responseText[i];
      let delay = 12 + Math.random() * 18;
      if (['.', '!', '?'].includes(char)) delay = 80 + Math.random() * 60;
      else if (char === '\n') delay = 40 + Math.random() * 30;
      else if (char === ',') delay = 30 + Math.random() * 20;

      await sleep(delay);
    }
  }
}
