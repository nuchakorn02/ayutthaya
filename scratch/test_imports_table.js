const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omlbtybplmeryoigwmac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing connection to imports table...');
  const { data: impData, error: impError } = await supabase.from('imports').select('*').limit(1);
  if (impError) {
    console.error('Error querying imports table:', impError);
  } else {
    console.log('Successfully queried imports table! Data:', impData);
  }

  console.log('Testing connection to import_logs table...');
  const { data: logData, error: logError } = await supabase.from('import_logs').select('*').limit(1);
  if (logError) {
    console.error('Error querying import_logs table:', logError);
  } else {
    console.log('Successfully queried import_logs table! Data:', logData);
  }
  
  console.log('Testing connection to login_attempts table...');
  const { data: attData, error: attError } = await supabase.from('login_attempts').select('*').limit(1);
  if (attError) {
    console.error('Error querying login_attempts table:', attError);
  } else {
    console.log('Successfully queried login_attempts table! Data:', attData);
  }
}

test();
