/**
 * Shared position/rank utility functions used by both the public leaderboard
 * and the admin dashboard. Single source of truth — edit here to fix both.
 */

interface RankThreshold {
  score: number;
  guardTitle: string;
  policeTitle: string;
}

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
