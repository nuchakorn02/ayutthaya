import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/server';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'rankSettings.json');

function readFallbackFile() {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (err) {
    console.error('Error reading fallback rank settings file:', err);
  }
  return { thresholds: [] };
}

export async function GET() {
  try {
    // 1. Try fetching from Supabase database first (persistent across serverless instances)
    try {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('app_settings')
        .select('value')
        .eq('key', 'rank_thresholds')
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value.thresholds)) {
        return NextResponse.json(data.value);
      }
    } catch (dbErr) {
      console.warn('Supabase app_settings read failed, using filesystem fallback:', dbErr);
    }

    // 2. Fallback to local rankSettings.json file
    const fallbackData = readFallbackFile();
    return NextResponse.json(fallbackData);
  } catch (error) {
    console.error('Error in GET /api/settings/ranks:', error);
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate schema before saving
    if (!data || !Array.isArray(data.thresholds) || data.thresholds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid data: thresholds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each threshold entry has required fields and correct types
    for (const t of data.thresholds) {
      if (
        typeof t.score !== 'number' ||
        typeof t.policeTitle !== 'string' || t.policeTitle.trim() === '' ||
        typeof t.guardTitle !== 'string' || t.guardTitle.trim() === ''
      ) {
        return NextResponse.json(
          { error: 'Invalid threshold entry: each item must have score (number), policeTitle (string), guardTitle (string)' },
          { status: 400 }
        );
      }
    }

    let dbSaved = false;
    let fsSaved = false;

    // 1. Persist to Supabase database (primary source of truth for production/serverless)
    try {
      const adminClient = createAdminClient();
      const { error: dbError } = await adminClient
        .from('app_settings')
        .upsert({
          key: 'rank_thresholds',
          value: data,
          updated_at: new Date().toISOString()
        });

      if (!dbError) {
        dbSaved = true;
      } else {
        console.warn('Supabase app_settings upsert error:', dbError.message);
      }
    } catch (dbErr) {
      console.warn('Could not connect to Supabase to save rank settings:', dbErr);
    }

    // 2. Sync to local file when filesystem is writable (useful for local dev and offline cache)
    try {
      const dir = path.dirname(SETTINGS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      fsSaved = true;
    } catch (fsErr) {
      console.warn('Filesystem write failed (expected on serverless environments like Vercel):', fsErr);
    }

    if (!dbSaved && !fsSaved) {
      return NextResponse.json(
        { error: 'Failed to persist settings to database and filesystem' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      persistedTo: { database: dbSaved, filesystem: fsSaved }
    });
  } catch (error) {
    console.error('Error saving rank settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
