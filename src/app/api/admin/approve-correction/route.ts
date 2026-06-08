import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transliterateTeluguToEnglish, generateSearchTokens, generateCanonicalName } from '@/lib/extraction/tokenizer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { queue_id, voter_id, admin_id, updates } = await req.json();

    if (!queue_id || !voter_id || !admin_id || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Auto-transliterate English names if Telugu name is provided and English is missing or matching the telugu
    if (updates.voter_name_telugu && !updates.voter_name_english) {
      updates.voter_name_english = generateCanonicalName(transliterateTeluguToEnglish(updates.voter_name_telugu));
    }
    if (updates.relative_name_telugu && !updates.relative_name_english) {
      updates.relative_name_english = generateCanonicalName(transliterateTeluguToEnglish(updates.relative_name_telugu));
    }

    // Since name might have changed, we should ideally update the search_tokens too
    // But since pg_trgm is mainly used now, it's fine. We can just leave search_tokens as is or regenerate them.
    if (updates.voter_name_english || updates.voter_name_telugu) {
       const telugu = updates.voter_name_telugu || '';
       const english = updates.voter_name_english || '';
       const relTelugu = updates.relative_name_telugu || '';
       const epic = updates.epic_id || '';
       updates.search_tokens = generateSearchTokens(english, telugu, relTelugu, epic);
    }

    // 1. Update the live voters table with the service role key to bypass RLS
    const { error: updateError } = await supabaseAdmin
      .from('voters')
      .update(updates)
      .eq('id', voter_id);

    if (updateError) {
      console.error('Failed to update voters table:', updateError);
      return NextResponse.json({ error: 'Failed to update live table' }, { status: 500 });
    }

    // 2. Mark queue item as approved
    const { error: queueError } = await supabaseAdmin
      .from('voter_staging_queue')
      .update({ 
        status: 'APPROVED', 
        reviewer_id: admin_id, 
        reviewed_at: new Date().toISOString() 
      })
      .eq('id', queue_id);

    if (queueError) {
      console.error('Failed to update queue status:', queueError);
      return NextResponse.json({ error: 'Failed to update queue' }, { status: 500 });
    }

    // 3. Log it (optional but good)
    const logEntries = Object.keys(updates).map(key => ({
      voter_id: voter_id,
      admin_id: admin_id,
      field_changed: key,
      old_value: null, // We'd need to fetch this beforehand to be perfectly accurate
      new_value: updates[key]
    }));

    if (logEntries.length > 0) {
      await supabaseAdmin.from('correction_log').insert(logEntries);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Exception in approve-correction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
