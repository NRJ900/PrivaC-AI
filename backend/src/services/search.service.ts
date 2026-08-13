import axios from 'axios';
import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  snippet?: string;
}

const PUBLIC_INSTANCES = [
  'https://searx.be',
  'https://searx.org',
  'https://searx.fyi',
  'https://searx.work',
  'https://searx.run',
  'https://searx.win',
  'https://priv.au'
];

/**
 * Searches DuckDuckGo using a Python script (RAG-style retrieval).
 */
async function searchDDG(query: string): Promise<SearchResult[]> {
  try {
    console.log(`[Search] Trying DuckDuckGo for: "${query}"`);
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'search_ddg.py');
    console.log(`[Search] Executing python script with query`);
    
    const { stdout, stderr } = await execFileAsync('python', [scriptPath, query]);
    
    if (stderr && !stderr.includes('Warning')) {
      console.warn(`[Search] DDG Python Stderr: ${stderr}`);
    }

    if (!stdout || stdout.trim() === '') {
      console.log(`[Search] DDG Python returned empty stdout.`);
      return [];
    }

    const results = JSON.parse(stdout);
    console.log(`[Search Service] DDG Python Result Count: ${results.length}`);
    return results;
  } catch (err: any) {
    console.error(`[Search Service] CRITICAL FAILURE:`, err.message);
    // Log the full error to see if 'python' was even found
    console.error(err);
    return [];
  }
}

/**
 * Searches Ask.com by scraping its JSON initial state.
 */
async function searchAsk(query: string): Promise<SearchResult[]> {
  try {
    console.log(`[Search] Trying Ask.com for: "${query}"`);
    const searchUrl = `https://www.ask.com/web?q=${encodeURIComponent(query)}`;
    const res = await axios.get(searchUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });

    const html = res.data;
    const match = html.match(/window\.MESON\.initialState\s*=\s*({.*?});/s);
    
    if (match && match[1]) {
      const state = JSON.parse(match[1]);
      const results = state.search?.webResults?.results || [];
      
      if (results.length > 0) {
        return results.slice(0, 7).map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.abstract || '',
          snippet: r.abstract || ''
        }));
      }
    }
  } catch (err: any) {}
  return [];
}

/**
 * Searches Wikipedia as a high-reliability fallback.
 */
async function searchWikipedia(query: string): Promise<SearchResult[]> {
  try {
    console.log(`[Search] Falling back to Wikipedia for: "${query}"`);
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
    const res = await axios.get(wikiUrl, { timeout: 5000 });
    
    if (res.data?.query?.search) {
      return res.data.query.search.slice(0, 5).map((r: any) => ({
        title: r.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
        content: r.snippet.replace(/<[^>]*>/g, ''),
        snippet: r.snippet.replace(/<[^>]*>/g, '')
      }));
    }
  } catch (err: any) {}
  return [];
}

/**
 * Searches using SerpApi (Google Search).
 */
async function searchSerpApi(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.warn('[Search] SerpApi key missing. Skipping...');
    return [];
  }

  try {
    console.log(`[Search] Trying SerpApi for: "${query}"`);
    const res = await axios.get('https://serpapi.com/search.json', {
      params: {
        q: query,
        api_key: apiKey,
        engine: 'google',
        num: 8
      },
      timeout: 10000
    });

    if (res.data?.organic_results) {
      return res.data.organic_results.map((r: any) => ({
        title: r.title,
        url: r.link,
        content: r.snippet || '',
        snippet: r.snippet || ''
      }));
    }
  } catch (err: any) {
    console.error(`[Search] SerpApi failed: ${err.message}`);
  }
  return [];
}

/**
 * Searches the web using a reliable hierarchy: 
 * SerpApi (Google) -> DuckDuckGo (Python) -> Wikipedia.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  // 1. Try SerpApi (Highest Quality)
  const serpResults = await searchSerpApi(query);
  if (serpResults.length > 0) return serpResults;

  // 2. Try DuckDuckGo (Python) - FREE FALLBACK
  const ddgResults = await searchDDG(query);
  if (ddgResults && ddgResults.length > 0) return ddgResults;

  // 3. Emergency Fallback: Wikipedia
  console.log(`[Search] All engines failed/blocked. Using Wikipedia fallback...`);
  return await searchWikipedia(query);
}
