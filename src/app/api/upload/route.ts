import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const assembly_name = formData.get('assembly_name') as string
    const assembly_no = parseInt(formData.get('assembly_no') as string, 10)
    const part_no = parseInt(formData.get('part_no') as string, 10)
    const polling_station_name = formData.get('polling_station_name') as string || ''
    const engine = formData.get('engine') as string || 'gemini'

    // Validate
    if (!file || !assembly_name || isNaN(assembly_no) || isNaN(part_no)) {
      return NextResponse.json(
        { error: 'Missing required fields: file, assembly_name, assembly_no, part_no' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are accepted' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if this part already exists
    const { data: existing } = await supabase
      .from('voter_parts')
      .select('id, assembly_name, assembly_no, part_no, voter_count')
      .eq('assembly_no', assembly_no)
      .eq('part_no', part_no)
      .maybeSingle()

    // Store PDF in Supabase Storage
    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${assembly_no}_${part_no}_${Date.now()}.pdf`

    const { error: storageError } = await supabase.storage
      .from('voter-pdfs')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' })

    if (storageError && storageError.message !== 'The resource already exists') {
      console.warn('[upload] Storage warning:', storageError.message)
    }

    // Create extraction job
    const { data: job, error: jobError } = await supabase
      .from('extraction_jobs')
      .insert({
        assembly_name,
        assembly_no,
        part_no,
        source_pdf: fileName,
        status: 'pending',
        extraction_engine: engine,
      })
      .select()
      .single()

    if (jobError) throw jobError

    if (existing) {
      return NextResponse.json({
        conflict: true,
        existing: {
          assembly_name: existing.assembly_name,
          assembly_no: existing.assembly_no,
          part_no: existing.part_no,
          voter_count: existing.voter_count,
        },
        job_id: job.id,
        file_name: fileName,
      })
    }

    return NextResponse.json({
      conflict: false,
      job_id: job.id,
      file_name: fileName,
      assembly_name,
      assembly_no,
      part_no,
      polling_station_name,
    })
  } catch (err) {
    console.error('[upload] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
