const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
