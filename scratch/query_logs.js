const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omlbtybplmeryoigwmac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Querying imports table...');
  const { data: impData } = await supabase.from('imports').select('*');
  console.log('Imports:', impData);

  console.log('Querying import_logs table...');
  const { data: logData } = await supabase.from('import_logs').select('*');
  console.log('Import Logs Count:', logData ? logData.length : 0);
  console.log('Sample Import Logs:', logData ? logData.slice(0, 5) : []);
}

test();
