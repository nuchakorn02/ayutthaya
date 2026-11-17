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

function getSupabaseDbConfig(overrides = {}) {
  const host = overrides.host || requiredEnv('SUPABASE_DB_HOST');
  return {
    host,
    port: overrides.port || parseInt(process.env.SUPABASE_DB_PORT || '5432', 10),
    user: overrides.user || requiredEnv('SUPABASE_DB_USER'),
    password: requiredEnv('SUPABASE_DB_PASSWORD'),
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
    ...(overrides.connectionTimeoutMillis
      ? { connectionTimeoutMillis: overrides.connectionTimeoutMillis }
      : {}),
  };
}

module.exports = { getSupabaseConfig, getSupabaseDbConfig };
