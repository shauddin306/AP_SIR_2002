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

Extract every voter row visible on this page and return ONLY valid JSON.

Rules:
1. Preserve Telugu text EXACTLY as shown visually on the page. 
2. DO NOT GUESS OR AUTOCORRECT NAMES. Even if a name seems misspelled or rare (e.g. "Sharfunnisa"), transcribe the Telugu characters exactly as printed. Never substitute with common names.
3. Pay special attention to similar looking characters in Telugu (e.g., న్ vs క్). Do not hallucinate "ముస్తాక్" (Mustaq) if the text says "మస్తాన్" (Mastan), or vice-versa. Read the pixels carefully!
4. Generate English transliteration for every Telugu name.
5. Keep house numbers EXACTLY as shown (including A, B, 1-2, [D], 44-3A etc.)
5. Keep EPIC IDs and serial numbers EXACTLY as shown.
6. If a field is unclear or missing, set it to null.
7. Do NOT skip any voter row.
8. relation_type: బ = father, తల్లి = mother, భ = husband, etc.
9. gender: స్త్రీ = female, పురుషుడు = male.
10. Set confidence: "high" if text is clear, "medium" if slightly unclear, "low" if very blurry.
11. CRITICAL: You must output valid, strictly formatted JSON. Do NOT truncate. Do NOT use ellipses (...). You must extract EVERY single voter on the page.
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

export class GeminiExtractor {
  async extractVotersFromImage(
    imageBase64: string,
    mimeType: string,
    pageNo: number
  ): Promise<PageExtractionResult> {
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
        voter_name_english: v.voter_name_english
          || transliterateTeluguToEnglish(v.voter_name_telugu),
        relative_name_english: v.relative_name_english
          || transliterateTeluguToEnglish(v.relative_name_telugu),
      }))

      return { page_no: pageNo, voters }
    } catch (err: any) {
      console.error(`[GeminiExtractor] Page ${pageNo} error:`, err.message)
      return { page_no: pageNo, voters: [], error: String(err) }
    }
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
