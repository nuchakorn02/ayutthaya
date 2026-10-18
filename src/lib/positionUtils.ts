/**
 * Shared position/rank utility functions used by both the public leaderboard
 * and the admin dashboard. Single source of truth — edit here to fix both.
 */

import type { RankThreshold } from '@/lib/types';

/**
 * Calculate the default position/rank title for a player based on
 * their score and division. Supports dynamic thresholds from the database.
 */
export function calculateDefaultPosition(
  score: number,
  division: string,
  thresholds: RankThreshold[] = []
): string {
  if (division === 'คณะผู้บริหาร') return 'คณะผู้บริหารส่วนกลาง';
  if (division === 'กองทัพมหาเสือพิทักษ์') return 'ทหารเสือประจำพระองค์';
  if (division === 'กองทัพธรณินพิทักษ์') return 'ทหารธรณินพิทักษ์';
  if (division === 'กองทัพอาทมาต') return 'หมื่นอาทมาต';

  const isPolice = division === 'กองพระตำรวจหลวง';

  // Use dynamic thresholds from DB if available
  if (thresholds.length > 0) {
    for (const t of thresholds) {
      if (score >= t.score) return isPolice ? t.policeTitle : t.guardTitle;
    }
    const last = thresholds[thresholds.length - 1];
    return isPolice ? last.policeTitle : last.guardTitle;
  }

  // Fallback hardcoded thresholds
  if (score >= 600) return isPolice ? 'พันตำรวจหลวง | Royal Police Colonel' : 'นายพันเวร | Battalion Commander of Guardsmen';
  if (score >= 315) return isPolice ? 'นายกองตำรวจหลวง | Royal Police Battalion Commander' : 'นายกองเวร | Company Head Guardsmen';
  if (score >= 210) return isPolice ? 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer' : 'นายหมวดเวร | Platoon Head Guardsmen';
  if (score >= 110) return isPolice ? 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader' : 'นายหมู่เวร | Squad Head Guardsmen';
  if (score >= 60) return isPolice ? 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper' : 'พลทหารยามอาวุโส | Senior Guardsmen';
  if (score >= 45) return isPolice ? 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper' : 'พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen';
  if (score >= 20) return isPolice ? 'พลประจำการตำรวจหลวง | Active Royal Police Trooper' : 'พลทหารยาม | Guardsmen';
  return isPolice ? 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)' : 'พลอาสาสมัครทหารยาม | Junior Guardsmen';
}

/**
 * Get the display-ready position title, resolving police-specific overrides
 * and custom position labels for special roles.
 */
export function getDisplayPosition(
  position: string | undefined,
  score: number,
  division: string,
  thresholds: RankThreshold[] = []
): string {
  const basePos = position || calculateDefaultPosition(score, division, thresholds);
  if (division === 'กองพระตำรวจหลวง' && basePos) {
    if (basePos.includes('ครูฝึกทหารราชองครักษ์') || basePos.includes('Drill Master of the Royal Guards')) {
      return 'ครูฝึกตำรวจหลวง สายทอง | Royal Police Instructor (Golden Line)';
    }
    if (basePos.startsWith('นายพันเวร')) return 'พันตำรวจหลวง | Royal Police Colonel';
    if (basePos.startsWith('นายกองเวร')) return 'นายกองตำรวจหลวง | Royal Police Battalion Commander';
    if (basePos.startsWith('นายหมวดเวร')) return 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer';
    if (basePos.startsWith('นายหมู่เวร')) return 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader';
    if (basePos.startsWith('พลทหารยามอาวุโส')) return 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper';
    if (basePos.startsWith('พลทหารราชวัลลภพิเศษ')) return 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper';
    if (basePos.startsWith('พลทหารยาม')) return 'พลประจำการตำรวจหลวง | Active Royal Police Trooper';
    if (basePos.startsWith('พลอาสาสมัครทหารยาม')) return 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)';
  }
  return basePos;
}

export interface RankProgression {
  isSpecialDivision: boolean;
  isMaxRank: boolean;
  nextRankName?: string;
  pointsNeeded?: number;
  percentage?: number;
  currentMilestoneScore?: number;
  nextMilestoneScore?: number;
}

/**
 * Calculate the progress towards the next military rank for a given score and division.
 * Supports dynamic rank thresholds configured by the administrator.
 */
export function getRankProgression(
  score: number,
  division: string,
  thresholds: RankThreshold[] = []
): RankProgression {
  // Special divisions do not use score-based rank progression
  if (
    division === 'คณะผู้บริหาร' ||
    division === 'กองทัพมหาเสือพิทักษ์' ||
    division === 'กองทัพธรณินพิทักษ์' ||
    division === 'กองทัพอาทมาต'
  ) {
    return {
      isSpecialDivision: true,
      isMaxRank: false,
    };
  }

  const isPolice = division === 'กองพระตำรวจหลวง';

  // Sort ascending by score to find the next milestone
  const sortedThresholds: RankThreshold[] =
    thresholds.length > 0
      ? [...thresholds].sort((a, b) => a.score - b.score)
      : [
          { score: 20, guardTitle: 'Guardsmen (พลทหารยาม)', policeTitle: 'Active Trooper (พลประจำการตำรวจหลวง)' },
          { score: 45, guardTitle: 'Royal Elite Guardsmen (พลทหารราชวัลลภพิเศษ)', policeTitle: 'Special Trooper (พลตำรวจหลวงพิเศษ)' },
          { score: 60, guardTitle: 'Senior Guardsmen (พลทหารยามอาวุโส)', policeTitle: 'Senior Trooper (พลตำรวจหลวงอาวุโส)' },
          { score: 110, guardTitle: 'Squad Head Guardsmen (นายหมู่เวร)', policeTitle: 'Squad Leader (นายหมู่ตำรวจหลวง)' },
          { score: 210, guardTitle: 'Platoon Head Guardsmen (นายหมวดเวร)', policeTitle: 'Platoon Officer (นายหมวดตำรวจหลวง)' },
          { score: 315, guardTitle: 'Company Head Guardsmen (นายกองเวร)', policeTitle: 'Battalion Commander (นายกองตำรวจหลวง)' },
          { score: 600, guardTitle: 'Battalion Commander (นายพันเวร)', policeTitle: 'Colonel (พันตำรวจหลวง)' },
        ];

  // Filter out any threshold that is score 0 (base rank) when looking for the next milestone
  const milestones = sortedThresholds.filter((m) => m.score > 0);

  // Find next milestone where milestone.score > score
  const nextMilestone = milestones.find((m) => m.score > score);

  if (!nextMilestone) {
    return {
      isSpecialDivision: false,
      isMaxRank: true,
    };
  }

  // Previous milestone score
  const prevMilestone = [...milestones].reverse().find((m) => m.score <= score);
  const prevScore = prevMilestone ? prevMilestone.score : 0;

  const totalDiff = Math.max(1, nextMilestone.score - prevScore);
  const currentDiff = Math.max(0, score - prevScore);
  const percentage = Math.max(0, Math.min(100, (currentDiff / totalDiff) * 100));
  const pointsNeeded = Math.max(0, nextMilestone.score - score);
  const nextRankName = isPolice ? nextMilestone.policeTitle : nextMilestone.guardTitle;

  return {
    isSpecialDivision: false,
    isMaxRank: false,
    nextRankName,
    pointsNeeded,
    percentage,
    currentMilestoneScore: prevScore,
    nextMilestoneScore: nextMilestone.score,
  };
}
