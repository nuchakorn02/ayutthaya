const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omlbtybplmeryoigwmac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('Fixing chong3556 record in players table...');
  const { data, error } = await supabase
    .from('players')
    .update({
      division: 'กองทัพมหาเสือพิทักษ์',
      position: 'ทหารเสือประจำพระองค์'
    })
    .eq('player_name', 'chong3556');

  if (error) {
    console.error('Error updating player:', error);
  } else {
    console.log('Player updated successfully!');
  }
}

fix();
