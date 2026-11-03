import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/server';
import { getFallbackRankThresholds, getRankThresholds } from '@/lib/rankSettings';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'rankSettings.json');

export async function GET() {
  try {
    // 1. Try fetching from Supabase database first (persistent across serverless instances)
    try {
      const adminClient = createAdminClient();
      const thresholds = await getRankThresholds(adminClient);
      return NextResponse.json({ thresholds });
    } catch (dbErr) {
      console.warn('Supabase app_settings read failed, using filesystem fallback:', dbErr);
    }

    // 2. Fallback to local rankSettings.json file
    return NextResponse.json({ thresholds: getFallbackRankThresholds() });
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
