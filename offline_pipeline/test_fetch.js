require('dotenv').config({path: '../.env.local'});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
sb.from('voter_staging_queue').select('*, voters(epic_id, house_no)').limit(1).then(r => console.log(JSON.stringify(r.data, null, 2)));
