const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omlbtybplmeryoigwmac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Attempting to delete players with .neq("id", "00000000-0000-0000-0000-000000000000")...');
  const { data, error } = await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log('Delete succeeded! Returned data length:', data ? data.length : 'null/void');
    
    // Check remaining players
    const { data: remaining } = await supabase.from('players').select('*');
    console.log('Remaining players in DB:', remaining ? remaining.length : 0);
  }
}

test();
