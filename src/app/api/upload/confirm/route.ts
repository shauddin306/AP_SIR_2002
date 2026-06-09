import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'
import { pdfToImages } from '@/lib/extraction/pdf-extractor'
import { GeminiExtractor } from '@/lib/extraction/gemini-client'
import { transliterateTeluguToEnglish } from '@/lib/extraction/tokenizer'

export const runtime = 'nodejs'
// export const maxDuration = 60

const RATE_LIMIT_MS = 150 // delay between Gemini calls

/**
 * Start background extraction for a job.
 * Called after user confirms OVERWRITE or on fresh upload.
 */
async function runExtractionJob(
  jobId: string,
  fileName: string,
  meta: {
    assembly_name: string
    assembly_no: number
    part_no: number
    polling_station_name: string
    polling_station_no?: number
    engine?: string
  }
) {
  const supabase = createServiceClient()
  const extractor = new GeminiExtractor()

  try {
    // Mark job as running
    await supabase
      .from('extraction_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('voter-pdfs')
      .download(fileName)

    if (downloadError || !fileData) throw new Error(`Failed to download PDF: ${downloadError?.message}`)

    const pdfBuffer = Buffer.from(await fileData.arrayBuffer())

    // Convert PDF pages to images
    const pageImages = await pdfToImages(pdfBuffer)

    await supabase
      .from('extraction_jobs')
      .update({ total_pages: pageImages.length, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Upsert voter_part record
    await supabase
      .from('voter_parts')
      .upsert({
        assembly_name: meta.assembly_name,
        assembly_no: meta.assembly_no,
        part_no: meta.part_no,
        polling_station_name: meta.polling_station_name,
        polling_station_no: meta.polling_station_no,
        source_pdf: fileName,
        voter_count: 0,
      }, { onConflict: 'assembly_no,part_no' })

    // ✅ CRITICAL FIX: If this is an OVERWRITE, we must delete all existing voters 
    // for this assembly and part from the database before extracting again. 
    // Otherwise, Attempt 1 will instantly crash due to duplicate EPIC IDs.
    const { error: wipeError } = await supabase
      .from('voters')
      .delete()
      .match({ assembly_no: meta.assembly_no, part_no: meta.part_no })

    if (wipeError) {
      console.error(`[extraction] Warning: Failed to wipe old voters for overwrite:`, wipeError.message)
    }

    let totalVoters = 0
    let skippedPages = 0
    const failedPages: string[] = [] // Track exact pages AND their error reasons
    const batchSize = 50
    // Use lower concurrency for Python engine (Surya AI) as it consumes ~2.5GB RAM per model
    // and blocks CPU heavily, which causes deadlocks/freezes when running concurrently.
    const CONCURRENCY = meta.engine === 'python' ? 1 : 3
    console.log(`[extraction] Starting extraction of ${pageImages.length} pages in chunks of ${CONCURRENCY}...`)

    for (let i = 0; i < pageImages.length; i += CONCURRENCY) {
      const chunk = pageImages.slice(i, i + CONCURRENCY)
      
      await Promise.all(chunk.map(async (image) => {
        let retries = 0;
        let success = false;
        let lastErrorMsg = "";
        
        while (retries < 5 && !success) { // Increased retries to 5 for 503s
          try {
            let result;
            if (meta.engine === 'python') {
              // Use env var so this works both locally and on Railway/Vercel
              const pythonEngineUrl = process.env.PYTHON_ENGINE_URL ?? 'http://127.0.0.1:8001'
              const pyRes = await fetch(`${pythonEngineUrl}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  image_base64: image.base64,
                  page_no: image.page
                })
              })
              if (!pyRes.ok) {
                const errText = await pyRes.text()
                throw new Error(`Python OCR Error: ${errText}`)
              }
              result = await pyRes.json()
              // Auto-fill English names from Telugu using local transliteration
              // This is 100% free — no Gemini API call needed
              result.voters = (result.voters || []).map((v: any) => ({
                ...v,
                voter_name_english: v.voter_name_english ||
                  transliterateTeluguToEnglish(v.voter_name_telugu),
                relative_name_english: v.relative_name_english ||
                  transliterateTeluguToEnglish(v.relative_name_telugu),
              }))
            } else {
              result = await extractor.extractVotersFromImage(
                image.base64,
                image.mimeType,
                image.page
              )
            }

            if (result.error) {
              throw new Error(result.error)
            }

            if (result.voters.length === 0) {
              console.log(`[extraction] Page ${image.page}: no voters found (header/footer), skipping`)
              success = true;
              break;
            }

            const enrichedVoters = await extractor.enrichVotersBatch(result.voters, {
              assembly_name: meta.assembly_name,
              assembly_no: meta.assembly_no,
              part_no: meta.part_no,
              polling_station_name: meta.polling_station_name,
              polling_station_no: meta.polling_station_no,
              source_pdf: fileName,
            }).then(voters => voters.map(v => ({ ...v, extraction_engine: meta.engine || 'gemini' })))

            // ✅ IDEMPOTENCY: Clear out partially inserted voters from previous failed attempts on this page
            const { error: deleteError } = await supabase
              .from('voters')
              .delete()
              .match({ assembly_no: meta.assembly_no, part_no: meta.part_no, page_no: image.page })
            
            if (deleteError) {
              console.warn(`[extraction] Warning: Failed to clean up previous failed attempt on page ${image.page}:`, deleteError.message)
            }

            let savedThisPage = 0
            for (let j = 0; j < enrichedVoters.length; j += batchSize) {
              const batch = enrichedVoters.slice(j, j + batchSize)
              const { error: insertError, data: inserted } = await supabase
                .from('voters')
                .insert(batch)
                .select('id')
              if (insertError) {
                console.error(`[extraction] DB insert failed on page ${image.page}:`, insertError.message)
                throw new Error(`DB Insert Error: ${insertError.message}`)
              }
              savedThisPage += (inserted?.length ?? 0)
            }

            if (savedThisPage !== enrichedVoters.length) {
              console.warn(`[extraction] Page ${image.page} MISMATCH: extracted=${enrichedVoters.length} saved=${savedThisPage}`)
            }

            totalVoters += savedThisPage
            success = true;
          } catch (pageErr: any) {
            lastErrorMsg = pageErr?.message || String(pageErr);
            console.error(`[extraction] Page ${image.page} failed (Attempt ${retries + 1}):`, lastErrorMsg)
            
            retries++;
            
            if (retries >= 5) {
              skippedPages++
              // Extract the most useful part of the error message
              const shortError = lastErrorMsg.includes('SyntaxError') ? 'Bad JSON / Truncated' 
                : lastErrorMsg.includes('503') ? 'Google API Overloaded' 
                : lastErrorMsg.includes('Safety') ? 'Google Safety Filter Blocked' 
                : lastErrorMsg.slice(0, 40);
              
              failedPages.push(`Pg ${image.page} (${shortError})`)
              console.error(`[extraction] Page ${image.page} permanently failed. Total skipped: ${skippedPages}`)
              await supabase
                .from('extraction_jobs')
                .update({
                  error_message: `Warning: ${skippedPages} page(s) skipped [${failedPages.join(' | ')}]`,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', jobId)
              break;
            }

            const isOverloaded = pageErr.status === 429 || pageErr.status === 503 || pageErr.message?.includes('429') || pageErr.message?.includes('503') || pageErr.message?.includes('Quota') || pageErr.message?.includes('high demand')
            
            if (isOverloaded) {
              // Add jitter to prevent all 3 requests from waking up at the exact same millisecond
              const delay = 30000 + Math.floor(Math.random() * 10000)
              console.log(`API Overloaded (503/429) on page ${image.page} — sleeping ${Math.floor(delay/1000)}s...`)
              await new Promise(r => setTimeout(r, delay))
            } else {
              console.log(`Page ${image.page} error (${pageErr.message?.slice(0,80)}). Retrying in 5s...`)
              await new Promise(r => setTimeout(r, 5000))
            }
          }
        }
      }))

      // ✅ Update progress AFTER the entire chunk is complete
      const maxPage = Math.min(i + CONCURRENCY, pageImages.length)
      console.log(`[extraction] Finished chunk ${Math.floor(i/CONCURRENCY) + 1}. Processed up to page ${maxPage}/${pageImages.length}`)
      
      await supabase
        .from('extraction_jobs')
        .update({
          processed_pages: maxPage,
          total_voters: totalVoters,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    // Update voter count in voter_parts
    await supabase
      .from('voter_parts')
      .update({ voter_count: totalVoters })
      .eq('assembly_no', meta.assembly_no)
      .eq('part_no', meta.part_no)

    // Mark job done
    await supabase
      .from('extraction_jobs')
      .update({
        status: 'done',
        total_voters: totalVoters,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

  } catch (err) {
    console.error('[extraction] Job failed:', err)
    await supabase
      .from('extraction_jobs')
      .update({
        status: 'error',
        error_message: String(err),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, job_id, file_name, assembly_name, assembly_no, part_no, polling_station_name, engine = 'gemini' } = body

    if (!job_id || !action) {
      return NextResponse.json({ error: 'Missing job_id or action' }, { status: 400 })
    }

    const supabase = createServiceClient()

    if (action === 'CANCEL') {
      await supabase.from('extraction_jobs').delete().eq('id', job_id)
      return NextResponse.json({ cancelled: true })
    }

    if (action === 'OVERWRITE') {
      // Delete existing voters for this part
      await supabase
        .from('voters')
        .delete()
        .eq('assembly_no', assembly_no)
        .eq('part_no', part_no)

      await supabase
        .from('voter_parts')
        .delete()
        .eq('assembly_no', assembly_no)
        .eq('part_no', part_no)
    }

    if (action === 'START' || action === 'OVERWRITE') {
      // Start extraction in background (fire and forget)
      // In production on Vercel, use a queue (Inngest/QStash)
      // Here we trigger and respond immediately
      setImmediate(() => {
        runExtractionJob(job_id, file_name, {
          assembly_name,
          assembly_no,
          part_no,
          polling_station_name: polling_station_name || assembly_name,
          engine,
        })
      })

      return NextResponse.json({ started: true, job_id })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
