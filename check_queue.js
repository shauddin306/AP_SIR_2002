require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('extraction_jobs').select('status, assembly_no, part_no');
  if (error) { console.error(error); return; }
  
  const counts = { pending: 0, running: 0, done: 0, error: 0 };
  const pendingParts152 = [];
  
  data.forEach(job => {
    counts[job.status] = (counts[job.status] || 0) + 1;
    if (job.status === 'pending' && job.assembly_no === 152) {
      pendingParts152.push(job.part_no);
    }
  });
  
  console.log('\n=======================================');
  console.log('   🗳️  VOTER AI QUEUE LIVE STATUS  ');
  console.log('=======================================');
  console.log(`🟢 Finished (Done):  ${counts.done || 0}`);
  console.log(`🟡 Waiting (Pending): ${counts.pending || 0}`);
  console.log(`🔵 Running (Active):  ${counts.running || 0}`);
  console.log(`🔴 Errored:          ${counts.error || 0}\n`);
  
  console.log('---------------------------------------');
  console.log(`Pending Parts for Rayachoty (152):`);
  console.log([...new Set(pendingParts152)].sort((a,b)=>a-b).join(', '));
  console.log('---------------------------------------\n');
}
run();
