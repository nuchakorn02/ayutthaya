const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://omlbtybplmeryoigwmac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGJ0eWJwbG1lcnlvaWd3bWFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTczMTI2OSwiZXhwIjoyMDk1MzA3MjY5fQ.v_7DcaXoY_Y_rMc-XbERx0PseWOLeXZD3z1JijywfAE'
);

async function fixScores() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: brokenHistories, error } = await supabase
    .from('score_history')
    .select('*, players(player_name)')
    .eq('old_score', -999)
    .eq('score_diff', 0)
    .gte('updated_at', today.toISOString());

  if (error) {
    console.error('Error fetching broken histories:', error);
    return;
  }

  console.log(`Found ${brokenHistories.length} broken history records.`);

  for (const history of brokenHistories) {
    // Find the record where they were set to -999 in import_logs
    const { data: previousLog } = await supabase
      .from('import_logs')
      .select('old_score')
      .eq('player_name', history.players.player_name)
      .eq('new_score', -999)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousLog) {
      const realOldScore = previousLog.old_score;
      const newScore = history.new_score;
      const realScoreDiff = newScore - realOldScore;

      if (realScoreDiff !== 0) {
        console.log(`Fixing player ${history.players.player_name}: Diff ${realScoreDiff}`);
        
        // 1. Update score_history
        await supabase
          .from('score_history')
          .update({ score_diff: realScoreDiff })
          .eq('id', history.id);

        // 2. Update player's latest_change
        await supabase
          .from('players')
          .update({ latest_change: realScoreDiff })
          .eq('id', history.player_id);
      }
    }
  }
  
  console.log('Done fixing database!');
}

fixScores();
