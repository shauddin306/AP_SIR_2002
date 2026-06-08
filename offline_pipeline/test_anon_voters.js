require('dotenv').config({path: '../.env.local'});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
sb.from('voters').select('id, epic_id, house_no').limit(1).then(r => console.log("Anon voters read:", r.data));
