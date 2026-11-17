const test = require('node:test');
const assert = require('node:assert/strict');
const { getSupabaseConfig, getSupabaseDbConfig } = require('./supabase-env');

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_HOST',
  'SUPABASE_DB_USER',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_DB_PORT',
  'SUPABASE_DB_NAME',
];

function setEnv(t, values) {
  const previous = new Map(
    REQUIRED_ENV.map((name) => [name, process.env[name]])
  );

  for (const name of REQUIRED_ENV) {
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      process.env[name] = values[name];
    } else {
      delete process.env[name];
    }
  }

  t.after(() => {
    for (const [name, value] of previous) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });
}

test('requires a Supabase URL', (t) => {
  setEnv(t, { SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key' });

  assert.throws(() => getSupabaseConfig(), /NEXT_PUBLIC_SUPABASE_URL/);
});

test('requires a service-role key', (t) => {
  setEnv(t, { NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co' });

  assert.throws(() => getSupabaseConfig(), /SUPABASE_SERVICE_ROLE_KEY/);
});

test('rejects empty Supabase configuration values', (t) => {
  setEnv(t, {
    NEXT_PUBLIC_SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
  });

  assert.throws(() => getSupabaseConfig(), /NEXT_PUBLIC_SUPABASE_URL/);
});

test('returns configured values without changing them', (t) => {
  const config = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  };
  setEnv(t, config);

  assert.deepEqual(getSupabaseConfig(), {
    supabaseUrl: config.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
  });
});

test('requires DB host, user, and password', (t) => {
  setEnv(t, {
    NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  });

  assert.throws(() => getSupabaseDbConfig(), /SUPABASE_DB_HOST/);
});

test('returns DB config with defaults for optional values', (t) => {
  const config = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    SUPABASE_DB_HOST: 'db.placeholder.supabase.co',
    SUPABASE_DB_USER: 'postgres',
    SUPABASE_DB_PASSWORD: 'test-password',
  };
  setEnv(t, config);

  assert.deepEqual(getSupabaseDbConfig(), {
    host: config.SUPABASE_DB_HOST,
    port: 5432,
    user: config.SUPABASE_DB_USER,
    password: config.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
});

test('DB config accepts overrides and custom port', (t) => {
  const config = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    SUPABASE_DB_HOST: 'db.placeholder.supabase.co',
    SUPABASE_DB_USER: 'postgres',
    SUPABASE_DB_PASSWORD: 'test-password',
    SUPABASE_DB_PORT: '6543',
    SUPABASE_DB_NAME: 'customdb',
  };
  setEnv(t, config);

  assert.deepEqual(
    getSupabaseDbConfig({ host: 'overridden.host', connectionTimeoutMillis: 2000 }),
    {
      host: 'overridden.host',
      port: 6543,
      user: config.SUPABASE_DB_USER,
      password: config.SUPABASE_DB_PASSWORD,
      database: 'customdb',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 2000,
    }
  );
});
