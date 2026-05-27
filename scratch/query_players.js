const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omlbtybplmeryoigwmac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Querying players in database...');
  const { data: players, error } = await supabase.from('players').select('*').order('division', { ascending: true });
  if (error) {
    console.error('Error fetching players:', error);
  } else {
    console.log('Total Players Count:', players.length);
    players.forEach((p, idx) => {
      console.log(`[${idx+1}] Name: "${p.player_name}" | Division: "${p.division}" | Score: ${p.total_score} | Position: "${p.position}"`);
    });
  }
}

test();
