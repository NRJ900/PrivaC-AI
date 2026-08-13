import sys
import json
import warnings
import time
import random
import os
import contextlib

# Force silence
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"

def search(query):
    results = []
    # Regions to rotate through to bypass IP throttling
    regions = ["wt-wt", "us-en", "uk-en", "in-en", "ca-en"]
    random.shuffle(regions)
    
    # Silence all stderr from the library (RuntimeWarnings, etc.)
    with open(os.devnull, 'w') as f, contextlib.redirect_stderr(f):
        try:
            from duckduckgo_search import DDGS
            
            for region in regions:
                try:
                    # Tiny delay to look more human
                    time.sleep(random.uniform(0.1, 0.4))
                    
                    with DDGS() as ddgs:
                        # 1. Try News Index for timely queries
                        if any(x in query.lower() for x in ["news", "today", "latest", "2026"]):
                            resp = list(ddgs.news(query, region=region, max_results=6))
                            if resp:
                                for r in resp:
                                    results.append({
                                        "title": r.get('title', ''),
                                        "url": r.get('url', ''),
                                        "content": r.get('body', ''),
                                        "snippet": r.get('body', '')
                                    })
                        
                        # 2. Try Lite Backend (Text)
                        if len(results) < 3:
                            resp = list(ddgs.text(query, region=region, max_results=6, backend="lite"))
                            if resp:
                                for r in resp:
                                    results.append({
                                        "title": r.get('title', ''),
                                        "url": r.get('href', ''),
                                        "content": r.get('body', ''),
                                        "snippet": r.get('body', '')
                                    })
                        
                        if len(results) >= 3:
                            break
                except Exception:
                    continue
        except Exception:
            pass
            
    return results

if __name__ == "__main__":
    # Force UTF-8 output
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    try:
        if len(sys.argv) < 2:
            print(json.dumps([]))
        else:
            query = sys.argv[1]
            search_results = search(query)
            # Remove duplicates
            unique = []
            seen = set()
            for r in search_results:
                if r['url'] not in seen:
                    unique.append(r)
                    seen.add(r['url'])
            print(json.dumps(unique, ensure_ascii=False))
    except Exception:
        print(json.dumps([]))
    
    sys.stdout.flush()
    os._exit(0)
