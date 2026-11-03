import fs from 'fs';
import path from 'path';
import type { RankThreshold } from '@/lib/types';
import { loadRankThresholds } from '@/lib/rankThresholds.mjs';
import { createAdminClient } from '@/lib/supabase/server';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'rankSettings.json');

function readFallbackThresholds(): RankThreshold[] {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      const settings = JSON.parse(fileContent);
      if (Array.isArray(settings.thresholds)) return settings.thresholds;
    }
  } catch (error) {
    console.error('Error reading fallback rank settings file:', error);
  }
  return [];
}

export async function getRankThresholds(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<RankThreshold[]> {
  return loadRankThresholds(async () => {
    const { data, error } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'rank_thresholds')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data?.value?.thresholds;
  }, readFallbackThresholds());
}

export function getFallbackRankThresholds(): RankThreshold[] {
  return readFallbackThresholds();
}
