import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase with Service Role Key for Backend Insertions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// A simple hardcoded secret for the API Gateway to prevent unauthorized access.
// In a real production scenario, put this in an environment variable.
const GATEWAY_SECRET = process.env.INGEST_GATEWAY_SECRET || 'voter_engine_secret_key_2026';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${GATEWAY_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
    }

    const body = await req.json();
    const { volunteers_data, volunteer_id } = body;

    if (!volunteers_data || !Array.isArray(volunteers_data)) {
      return NextResponse.json({ error: 'Invalid payload format.' }, { status: 400 });
    }

    const assemblyNameMap: Record<number, string> = {
      143: 'Punganur',
      144: 'Madanapalle',
      151: 'Rajampet',
      152: 'Rayachoty',
      153: 'Lakkireddypalli',
      154: 'Kadapa',
      155: 'Railway Kodur',
    };


    const enrichedData = volunteers_data.map(v => {
      let safeAge = parseInt(v.age, 10);
      if (isNaN(safeAge)) safeAge = 0;
      if (safeAge > 150) safeAge = 0;
      if (safeAge < 0) safeAge = 0;

      return {
        ...v,
        age: safeAge,
        assembly_name: assemblyNameMap[v.assembly_no] || 'Unknown'
      };
    });

    // Deduplicate the array by (assembly_no, part_no, serial_no)
    // Postgres UPSERT will throw 'cannot affect row a second time' if there are exact duplicates in the payload.
    const uniqueMap = new Map();
    for (const row of enrichedData) {
      const key = `${row.assembly_no}_${row.part_no}_${row.serial_no}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, row);
      }
    }
    const deduplicatedData = Array.from(uniqueMap.values());

    // Prepare data for batch UPSERT
    // The ON CONFLICT relies on the composite unique constraint: assembly_no, part_no, serial_no
    const { data, error } = await supabase
      .from('voters')
      .upsert(deduplicatedData, { onConflict: 'assembly_no,part_no,serial_no', ignoreDuplicates: false });

    if (error) {
      console.error('Supabase Upsert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (deduplicatedData.length > 0) {
      const firstRow = deduplicatedData[0];

      // Get the exact number of voters in the database right now for this part
      const { count } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true })
        .eq('assembly_no', firstRow.assembly_no)
        .eq('part_no', firstRow.part_no);

      // Automatically register this part in the voter_parts index with the accurate count!
      await supabase.from('voter_parts').upsert({
        assembly_name: firstRow.assembly_name,
        assembly_no: firstRow.assembly_no,
        part_no: firstRow.part_no,
        polling_station_name: firstRow.assembly_name, // fallback
        voter_count: count || 0
      }, { onConflict: 'assembly_no,part_no' });
    }

    // Also update telemetry to say they ingested successfully
    if (volunteer_id) {
       // Fire and forget updating the 'voters_processed' count
       // Not critical if it fails here since telemetry ping also updates it
    }

    return NextResponse.json({ success: true, count: volunteers_data.length });
  } catch (err: any) {
    console.error('Ingest Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
