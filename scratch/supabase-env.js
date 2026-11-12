function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseConfig() {
  return {
    supabaseUrl: requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseServiceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

module.exports = { getSupabaseConfig };
