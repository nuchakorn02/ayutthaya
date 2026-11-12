const { getSupabaseConfig } = require('./supabase-env');
const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

fetch(`${supabaseUrl}/rest/v1/`, {
  headers: {
    'apikey': supabaseServiceRoleKey
  }
})
.then(r => r.json())
.then(spec => {
  console.log('Available RPC paths:');
  const paths = Object.keys(spec.paths || {});
  const rpcs = paths.filter(p => p.startsWith('/rpc/'));
  console.log(rpcs);
})
.catch(err => console.error(err));
