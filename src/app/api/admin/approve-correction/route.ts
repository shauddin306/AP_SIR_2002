import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
