import { generateSearchTokens, normalizeHouseNo, transliterateTeluguToEnglish, generateCanonicalName } from './tokenizer'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
// Force 2.5-flash for speed and low cost!
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

export interface ExtractedVoter {
  serial_no: number | null
  house_no: string | null
  voter_name_telugu: string | null
  voter_name_english: string | null
  relative_name_telugu: string | null
  relative_name_english: string | null
  relation_type: string | null
  gender: string | null
  age: number | null
  epic_id: string | null
  page_no: number
  confidence: 'high' | 'medium' | 'low'
}

export interface PageExtractionResult {
  page_no: number
  voters: ExtractedVoter[]
  error?: string
}

const EXTRACTION_PROMPT = `You are an expert AI system extracting voter data from Election Commission of India voter list PDFs (Andhra Pradesh).

The page shows a grid of individual voter boxes. Each voter box contains Telugu text with labeled fields.

FIELD IDENTIFICATION — CRITICAL: Find each field BY ITS TELUGU LABEL, not by position.
Telugu field labels you will see in each voter box:
- "పేరు" or "పేరు:" → VOTER NAME (voter_name_telugu). This is the voter's own name.
- "తండ్రి పేరు", "భర్త పేరు", "తల్లి పేరు", "తండ్రి/భర్త పేరు" → RELATIVE NAME (relative_name_telugu). This is father/husband/mother's name.
- "గృహ సంఖ్య" or "గృ.సం" → house number
- "వయసు" or "వయస్సు" → age (a 2-digit number like 35, 42, 67)
- "లింగం" → gender (పురుషుడు = Male, స్త్రీ = Female)
- VOTER ID / EPIC No → always a pattern of 2-3 uppercase English letters + 5-8 digits (e.g., AP2215200001, APC0123456)

EXTRACTION RULES:
1. Find the VOTER NAME by looking for "పేరు:" label. The name text comes after the colon or on the next line.
2. Find the RELATIVE NAME by looking for "తండ్రి పేరు:", "భర్త పేరు:", or "తల్లి పేరు:" label.
3. Be careful not to confuse the voter_name field with the EPIC voter ID or house number.
4. NEVER put the voter_name in the relative_name field or vice versa.
5. Preserve Telugu text EXACTLY as shown visually. DO NOT GUESS OR AUTOCORRECT NAMES.
6. Even if a name seems rare (e.g. "Sharfunnisa", "Mastanaiah"), transcribe the Telugu characters exactly as printed. Never substitute with a common/similar name.
7. Pay special attention to similar-looking Telugu characters (e.g., న్ vs క్). Do not hallucinate "ముస్తాక్" (Mustaq) if the text says "మస్తాన్" (Mastan).
8. Generate English transliteration for every Telugu name.
9. Keep house numbers EXACTLY as shown (including A, B, 1-2, [D], 44-3A etc.)
10. Keep EPIC IDs and serial numbers EXACTLY as shown.
11. Extract whatever text is in the name field area, EXACTLY as it appears, even if it looks like garbage, contains typos, or is slightly blurry. Give it as it is.
12. Do NOT skip any voter row.
13. relation_type: బ = father (తండ్రి), తల్లి = mother, భ = husband, etc.
14. gender: స్త్రీ = female, పురుషుడు = male.
15. Set confidence: "high" if text is clear, "medium" if slightly unclear, "low" if very blurry.
16. CRITICAL: You must output valid, strictly formatted JSON. Do NOT truncate. Do NOT use ellipses (...). Extract EVERY single voter on the page.

Return ONLY this JSON structure (no markdown, no explanation):
{
  "voters": [
    {
      "serial_no": 1,
      "house_no": "44-2",
      "voter_name_telugu": "జవారాబి షేక్",
      "voter_name_english": "Jawarabi Shaik",
      "relative_name_telugu": "అబ్బుల్ సత్తార్",
      "relative_name_english": "Abdul Sattar",
      "relation_type": "బ",
      "gender": "స్త్రీ",
      "age": 35,
      "epic_id": "AP221520000000",
      "confidence": "high"
    }
  ]
}`

/**
 * Passes through whatever the OCR extracted exactly as is, without nullifying it.
 * Only returns null if the string is completely empty.
 */
function sanitizeVoterName(name: string | null, epicId: string | null): string | null {
  if (!name) return null
  const trimmed = name.trim()
  if (!trimmed) return null
  return trimmed
}

export class GeminiExtractor {
  async extractVotersFromImage(
    imageBase64: string,
    mimeType: string,
    pageNo: number
  ): Promise<PageExtractionResult> {
    const maxRetries = 5;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: EXTRACTION_PROMPT },
              { inlineData: { mimeType: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: "application/json"
          }
        })

        const text = result.response.text().trim()

        if (!text) throw new Error('Gemini returned empty response')

        // Strip markdown code fences if model adds them
        const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

        const parsed = JSON.parse(jsonText)
        const voters: ExtractedVoter[] = (parsed.voters || []).map((v: ExtractedVoter) => ({
          ...v,
          page_no: pageNo,
          voter_name_telugu: sanitizeVoterName(v.voter_name_telugu, v.epic_id),
          voter_name_english: sanitizeVoterName(v.voter_name_english || transliterateTeluguToEnglish(v.voter_name_telugu), v.epic_id),
          relative_name_telugu: sanitizeVoterName(v.relative_name_telugu, v.epic_id),
          relative_name_english: sanitizeVoterName(v.relative_name_english || transliterateTeluguToEnglish(v.relative_name_telugu), v.epic_id),
        }))

        return { page_no: pageNo, voters }
      } catch (err: any) {
        const errMsg = String(err.message || err);
        if (errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('fetch failed')) {
          attempt++;
          if (attempt >= maxRetries) {
            console.error(`[GeminiExtractor] Page ${pageNo} failed after ${maxRetries} retries:`, errMsg);
            return { page_no: pageNo, voters: [], error: errMsg };
          }
          const backoff = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s, 32s
          console.warn(`[GeminiExtractor] Page ${pageNo} rate limited (${errMsg}). Retrying in ${backoff/1000}s (Attempt ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        } else {
          console.error(`[GeminiExtractor] Page ${pageNo} parsing error:`, errMsg);
          return { page_no: pageNo, voters: [], error: errMsg };
        }
      }
    }
    return { page_no: pageNo, voters: [], error: 'Max retries exceeded' };
  }

  // EMBEDDINGS DISABLED — saves ~95% of API cost.
  // Search quality is maintained through search_tokens (GIN index on text array).
  // Re-enable only if semantic similarity search is needed in a future version.
  async generateNameEmbedding(_name: string): Promise<number[] | null> {
    return null
  }
  async generateNameEmbeddingsBatch(names: string[]): Promise<Array<number[] | null>> {
    return names.map(() => null)
  }

  /**
   * Enrich a batch of voters with search tokens and embeddings
   */
  async enrichVotersBatch(voters: ExtractedVoter[], meta: {
    assembly_name: string
    assembly_no: number
    part_no: number
    polling_station_no?: number
    polling_station_name?: string
    source_pdf: string
  }) {
    const namesForEmbedding = voters.map(v => 
      [v.voter_name_english, v.voter_name_telugu].filter(Boolean).join(' ')
    )
    
    // Embeddings disabled to control costs. Returns null for all.
    const embeddings = await this.generateNameEmbeddingsBatch(namesForEmbedding)

    return voters.map((voter, i) => {
      const search_tokens = generateSearchTokens(
        voter.voter_name_telugu,
        voter.voter_name_english,
        voter.relative_name_telugu,
        voter.relative_name_english
      )

      const house_no_normalized = normalizeHouseNo(voter.house_no)
      const name_embedding = embeddings[i]

      return {
        ...meta,
        serial_no: parseInt(String(voter.serial_no), 10) || 0,
        house_no: voter.house_no ? String(voter.house_no).trim() : null,
        house_no_normalized,
        voter_name_telugu: voter.voter_name_telugu,
        voter_name_english: voter.voter_name_english,
        relative_name_telugu: voter.relative_name_telugu,
        relative_name_english: voter.relative_name_english,
        relation_type: voter.relation_type,
        gender: voter.gender,
        age: parseInt(String(voter.age), 10) || null,
        epic_id: voter.epic_id,
        page_no: voter.page_no,
        search_tokens,
        search_name_canonical: generateCanonicalName(voter.voter_name_english),
        name_embedding: name_embedding ? `[${name_embedding.join(',')}]` : null,
        confidence: voter.confidence ?? 'high',
      }
    })
  }
}
