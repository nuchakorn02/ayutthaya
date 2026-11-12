const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig } = require('./supabase-env');

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function check() {
  const { data, error } = await supabase.from('score_history').select('*').limit(1);
  if (error) {
    console.error('Error fetching score_history:', error);
  } else {
    console.log('Successfully fetched score_history row:', data);
  }
}

check();
