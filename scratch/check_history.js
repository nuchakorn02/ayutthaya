const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://omlbtybplmeryoigwmac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE'
);

async function checkHistory() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoISO = threeDaysAgo.toISOString();

  const { data, error } = await supabase
    .from('score_history')
    .select('player_id, score_diff, old_score, new_score, updated_at, players(player_name)')
    .gte('updated_at', threeDaysAgoISO)
    .order('score_diff', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error(error);
  } else {
    console.log("Highest score_diffs in last 3 days:");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkHistory();
