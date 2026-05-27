const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://omlbtybplmeryoigwmac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE';

async function run() {
  const res = await fetch(supabaseUrl + '/rest/v1/', {
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey
    }
  });
  const json = await res.json();
  console.log('Paths in OpenAPI schema:');
  Object.keys(json.paths).forEach(p => {
    if (p.includes('rpc')) {
      console.log('RPC Path:', p);
    }
  });
}

run();
