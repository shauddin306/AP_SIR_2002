const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const pythonOutput = {
      "serial_no": 21,
      "voter_name_telugu": "యాసిన",
      "voter_name_english": "",
      "relative_name_telugu": "ఖాషుసాహెబ",
      "relative_name_english": "",
      "relation_type": "తం",
      "house_no": "1-6",
      "age": 42,
      "gender": "Male",
      "epic_id": "AP22152055",
      "page_no": 3,
      "confidence": "high"
  };

  const meta = {
    assembly_name: 'Rayachoty',
    assembly_no: 152,
    part_no: 189,
    polling_station_name: 'Rayachoty',
    polling_station_no: 189,
    source_pdf: 'test.pdf',
    extraction_engine: 'python'
  };

  const enriched = {
    ...meta,
    serial_no: pythonOutput.serial_no,
    house_no: pythonOutput.house_no,
    house_no_normalized: 1.00006, // fake normalization
    voter_name_telugu: pythonOutput.voter_name_telugu,
    voter_name_english: "Yasina",
    relative_name_telugu: pythonOutput.relative_name_telugu,
    relative_name_english: "Khashu",
    relation_type: pythonOutput.relation_type,
    gender: pythonOutput.gender,
    age: pythonOutput.age,
    epic_id: pythonOutput.epic_id,
    page_no: pythonOutput.page_no,
    search_tokens: ['yasina'],
    search_name_canonical: 'yasina',
    name_embedding: null,
    confidence: pythonOutput.confidence
  };

  const { error, data } = await supabase.from('voters').insert([enriched]).select('id');
  if (error) console.error("INSERT ERROR:", error);
  else {
      console.log("INSERT SUCCESS:", data);
      await supabase.from('voters').delete().eq('id', data[0].id);
  }
}
test();
