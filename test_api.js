const fs = require('fs');

async function test() {
  const base64 = fs.readFileSync('offline_pipeline/temp_pages/152_189/page_3.jpg', {encoding: 'base64'});
  const res = await fetch('http://localhost:8001/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64, page_no: 3 })
  });
  
  if (!res.ok) {
     console.log("Error", await res.text());
     return;
  }
  
  let result = await res.json();
  console.log("Python result:", JSON.stringify(result, null, 2));
}

test();
