const { createClient } = require('@supabase/supabase-js');
const { runHistoryRepair } = require('./historyRepair');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const placeholderValues = new Set([
  '******',
  'your_supabase_project_url',
  'your_supabase_service_role_key',
]);

if (
  !supabaseUrl ||
  !supabaseServiceKey ||
  placeholderValues.has(supabaseUrl) ||
  placeholderValues.has(supabaseServiceKey)
) {
  console.error(
    'Missing Supabase credentials. Run with `node --env-file=.env.local scratch/fix_history.js` or set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exitCode = 1;
} else {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const outcome = await runHistoryRepair(supabase, {
      today,
      log: console.log,
    });
    process.exitCode = outcome.exitCode;
  }

  main().catch((error) => {
    console.error('History repair failed:', error);
    process.exitCode = 1;
  });
}
