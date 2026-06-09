const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.rpc('get_schema', { table_name: 'voters' });
  if (error) {
     // If no rpc, let's just insert one specific key at a time to find which one fails
     console.log("fallback");
  }
}
test();
