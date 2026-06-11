import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key for backend operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { volunteer_id, current_task, mac_address, os_info, voters_processed } = body;
    const ip_address = req.headers.get('x-forwarded-for') || 'Unknown';

    if (!volunteer_id) {
      return NextResponse.json({ error: 'Missing volunteer_id' }, { status: 400 });
    }

    // UPSERT the telemetry ping
    // We update the record if it exists for this volunteer, or insert a new one
    // Actually, we'll try to find by volunteer_id and mac_address and update, or insert.
    // To make it simple, we can just do an update, and if no rows, insert.

    const { data: existing, error: findErr } = await supabase
      .from('volunteer_sessions')
      .select('id')
      .eq('volunteer_id', volunteer_id)
      .eq('mac_address', mac_address)
      .single();

    if (existing) {
      // Update
      await supabase
        .from('volunteer_sessions')
        .update({
          status: 'active',
          current_task,
          voters_processed,
          ip_address,
          os_info,
          last_ping: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Insert
      await supabase
        .from('volunteer_sessions')
        .insert({
          volunteer_id,
          status: 'active',
          current_task,
          mac_address,
          ip_address,
          os_info,
          voters_processed,
          last_ping: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Telemetry Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
