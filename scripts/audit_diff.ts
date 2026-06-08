import { createClient } from '@supabase/supabase-js'
import { GeminiExtractor } from '../src/lib/extraction/gemini-client'
import { pdfToImages } from '../src/lib/extraction/pdf-extractor'
import fs from 'fs'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const args = process.argv.slice(2)
const assemblyArg = args.find(a => a.startsWith('--assembly='))
const partArg = args.find(a => a.startsWith('--part='))
const isFixMode = args.includes('--fix')

if (!assemblyArg || !partArg) {
  console.error('Usage: npx tsx scripts/audit_diff.ts --assembly=<no> --part=<no> [--fix]')
  process.exit(1)
}

const assembly_no = parseInt(assemblyArg.split('=')[1])
const part_no = parseInt(partArg.split('=')[1])

async function runAudit() {
  console.log(`🔍 Starting Audit for Assembly ${assembly_no}, Part ${part_no}`)
  
  // 1. Fetch existing data from DB
  console.log(`[1/4] Fetching existing records from DB...`)
  const { data: existingVoters, error: dbError } = await supabase
    .from('voters')
    .select('*')
    .eq('assembly_no', assembly_no)
    .eq('part_no', part_no)
    .order('page_no', { ascending: true })

  if (dbError) throw dbError
  if (!existingVoters || existingVoters.length === 0) {
    console.error('❌ No voters found in DB for this part.')
    process.exit(1)
  }

  console.log(`✅ Found ${existingVoters.length} voters in DB.`)

  // 2. Determine source PDF
  const sourcePdfName = existingVoters[0].source_pdf
  if (!sourcePdfName) {
    console.error('❌ source_pdf is missing from the database records.')
    process.exit(1)
  }

  // 3. Download PDF
  console.log(`[2/4] Downloading original PDF (${sourcePdfName}) from Supabase Storage...`)
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('voter-pdfs')
    .download(sourcePdfName)

  if (downloadError) {
    console.error('❌ Failed to download PDF:', downloadError)
    process.exit(1)
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer())
  console.log(`✅ Downloaded ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB PDF.`)

  // 4. Convert PDF to Images
  console.log(`[3/4] Converting PDF to images...`)
  const images = await pdfToImages(pdfBuffer)
  console.log(`✅ Extracted ${images.length} pages.`)

  // 5. Re-run Gemini Extraction
  console.log(`[4/4] Re-running AI extraction on all pages...`)
  const extractor = new GeminiExtractor()
  const fixedVoters = []
  
  for (let i = 0; i < images.length; i++) {
    const pageNo = images[i].page
    process.stdout.write(`  Processing Page ${pageNo}/${images.length}... `)
    
    // Ignore first 2 pages (typically cover pages without voter data)
    if (pageNo <= 2) {
      console.log('Skipped (cover page)')
      continue
    }

    const result = await extractor.extractVotersFromImage(images[i].base64, images[i].mimeType, pageNo)
    fixedVoters.push(...result.voters)
    console.log(`Extracted ${result.voters.length} voters.`)
  }

  // 6. Diff Generation
  console.log(`\n================== AUDIT DIFF REPORT ==================\n`)
  let diffCount = 0
  const updates = []

  for (const existing of existingVoters) {
    // Match by EPIC ID or Serial Number + Page Number
    const fixed = fixedVoters.find(f => 
      (f.epic_id && f.epic_id === existing.epic_id) || 
      (f.serial_no === existing.serial_no && f.page_no === existing.page_no)
    )

    if (!fixed) continue

    const oldNameEn = existing.voter_name_english?.trim().toLowerCase()
    const newNameEn = fixed.voter_name_english?.trim().toLowerCase()
    const oldNameTe = existing.voter_name_telugu?.trim()
    const newNameTe = fixed.voter_name_telugu?.trim()

    // Detect if the name changed significantly
    if (oldNameEn !== newNameEn || oldNameTe !== newNameTe) {
      diffCount++
      console.log(`[Voter S.No: ${existing.serial_no} | EPIC: ${existing.epic_id || 'N/A'}]`)
      if (oldNameTe !== newNameTe) {
        console.log(`\x1b[31m- DB (Telugu): ${existing.voter_name_telugu}\x1b[0m`)
        console.log(`\x1b[32m+ PDF(Telugu): ${fixed.voter_name_telugu}\x1b[0m`)
      }
      if (oldNameEn !== newNameEn) {
        console.log(`\x1b[31m- DB (English): ${existing.voter_name_english}\x1b[0m`)
        console.log(`\x1b[32m+ PDF(English): ${fixed.voter_name_english}\x1b[0m`)
      }
      console.log('')

      updates.push({
        id: existing.id,
        voter_name_telugu: fixed.voter_name_telugu,
        voter_name_english: fixed.voter_name_english,
        relative_name_telugu: fixed.relative_name_telugu,
        relative_name_english: fixed.relative_name_english
      })
    }
  }

  console.log(`=======================================================`)
  console.log(`🏁 Audit Complete. Found ${diffCount} differences out of ${existingVoters.length} total voters.`)

  // 7. Fix Mode
  if (isFixMode && updates.length > 0) {
    console.log(`\n⚠️ FIX MODE ENABLED: Updating ${updates.length} records in the database...`)
    let successCount = 0
    for (const update of updates) {
      const { error } = await supabase
        .from('voters')
        .update({
          voter_name_telugu: update.voter_name_telugu,
          voter_name_english: update.voter_name_english,
          relative_name_telugu: update.relative_name_telugu,
          relative_name_english: update.relative_name_english,
        })
        .eq('id', update.id)
      
      if (!error) successCount++
    }
    console.log(`✅ Successfully fixed ${successCount}/${updates.length} records in the database!`)
  } else if (!isFixMode && updates.length > 0) {
    console.log(`\nℹ️ Run the script again with \x1b[33m--fix\x1b[0m to apply these corrections to your database.`)
  }
}

runAudit().catch(err => {
  console.error('Fatal Error:', err)
  process.exit(1)
})
