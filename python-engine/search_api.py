import os
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

from indic_phonetics import generate_telugu_variants

# Load environment variables from the Next.js .env.local file
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(dotenv_path=dotenv_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("MY_SUPA_VAL")

if not url:
    print("CRITICAL ERROR: NEXT_PUBLIC_SUPABASE_URL is missing or empty!")
if not key:
    print("CRITICAL ERROR: Supabase Key (MY_SUPA_VAL) is missing or empty!")

if url and key:
    supabase: Client = create_client(url, key)
else:
    print("Falling back to a dummy Supabase client so the server doesn't crash loop...")
    supabase = None

app = FastAPI(title="Indic NLP Search Engine")

class SearchRequest(BaseModel):
    query: str
    assembly_no: Optional[int] = None
    part_no: Optional[int] = None
    relative_name: Optional[str] = None
    limit: Optional[int] = 20

@app.post("/v1/search")
async def advanced_indic_search(req: SearchRequest):
    try:
        q = req.query.strip().lower()
        if not q:
            return {"results": [], "variants_tested": []}

        # 1. Generate Advanced Telugu Phonetic Variants
        telugu_variants = generate_telugu_variants(q)
        
        # 2. Build the Supabase Query
        # We will use the existing `search_voters` RPC or query the table directly.
        # But wait, our Python engine is smart enough to just query the `voters` table 
        # using `or` statements for all possible transliterations!
        
        # Create an OR string for the variants against the voter_name_telugu column
        or_conditions = []
        for variant in telugu_variants:
            or_conditions.append(f"voter_name_telugu.ilike.%{variant}%")
            
        # Add the original english query just in case
        or_conditions.append(f"voter_name_english.ilike.%{q}%")
        
        or_string = ",".join(or_conditions)

        # Build query
        query_builder = supabase.table('voters').select('*').or_(or_string)

        if req.assembly_no:
            query_builder = query_builder.eq('assembly_no', req.assembly_no)
        if req.part_no:
            query_builder = query_builder.eq('part_no', req.part_no)
        if req.relative_name:
            rel = req.relative_name.lower().strip()
            # Also generate variants for relative name
            rel_variants = generate_telugu_variants(rel)
            rel_or_conditions = [f"relative_name_telugu.ilike.%{v}%" for v in rel_variants]
            rel_or_conditions.append(f"relative_name_english.ilike.%{rel}%")
            query_builder = query_builder.or_(",".join(rel_or_conditions))

        query_builder = query_builder.limit(req.limit)
        
        # Execute query
        response = query_builder.execute()
        results = response.data

        # If strict search fails, fallback to Postgres fuzzy search RPC
        if not results:
            fallback_response = supabase.rpc('fuzzy_search_voters', {
                'query_text': q,
                'p_limit': req.limit
            }).execute()
            results = fallback_response.data
            
            for r in results:
                r['match_type'] = 'POSSIBLE'
                r['match_score'] = 0.5
        else:
            for r in results:
                r['match_type'] = 'EXACT'
                r['match_score'] = 1.0

        return {
            "results": results,
            "variants_tested": telugu_variants
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("search_api:app", host="0.0.0.0", port=8000, reload=True)
