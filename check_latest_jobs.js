const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('extraction_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) console.error(error);
  else console.log("Latest jobs:", data);
}
check();
