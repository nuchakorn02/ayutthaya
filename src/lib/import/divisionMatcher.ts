/**
 * Fuzzy matcher for Roblox Royal Guards military divisions.
 * Matches various abbreviations, colloquial names, and Thai numerals from uploaded sheets.
 */

export function matchDivisionFuzzy(valStr: string): string | null {
  if (!valStr || typeof valStr !== 'string') return null;

  const normalized = valStr.replace(/\s+/g, '').replace(/[·\-\.]/g, '').toLowerCase();

  if (
    normalized.includes('คณะผู้บริหาร') ||
    normalized.includes('ผู้บริหาร') ||
    normalized.includes('คณะบริหาร') ||
    normalized.includes('บริหาร')
  ) {
    return 'คณะผู้บริหาร';
  }

  if (
    normalized.includes('ธรณินพิทักษ์') ||
    normalized.includes('ธรณิน') ||
    normalized.includes('ทหารแมว') ||
    normalized.includes('แมวประจำพระองค์')
  ) {
    return 'กองทัพธรณินพิทักษ์';
  }

  if (
    normalized.includes('มหาเสือพิทักษ์') ||
    normalized.includes('มหาเสือ') ||
    normalized.includes('ทหารเสือ') ||
    normalized.includes('เสือประจำพระองค์') ||
    normalized.includes('เสือรักษาพระองค์') ||
    normalized.includes('เสือ')
  ) {
    return 'กองทัพมหาเสือพิทักษ์';
  }

  if (normalized.includes('อาทมาต') || normalized.includes('กองอาทมาต')) {
    return 'กองทัพอาทมาต';
  }

  if (
    normalized.includes('พระตำรวจหลวง') ||
    normalized.includes('ตำรวจหลวง') ||
    normalized.includes('พระตำรวจ')
  ) {
    return 'กองพระตำรวจหลวง';
  }

  // Match Mahadlek or Division 1-4
  if (
    normalized.includes('ปัญจะซันยะ') ||
    normalized.includes('ปัญจะ') ||
    normalized.includes('ปัญจ') ||
    normalized.includes('ทัพที่1') ||
    normalized.includes('มหาดเล็กราชวัลลภที่1') ||
    normalized.includes('มหาดเล็ก1')
  ) {
    return 'กองทัพที่ 1 ปัญจะซันยะ';
  }

  if (
    normalized.includes('วัชรนาถ') ||
    normalized.includes('ทัพที่2') ||
    normalized.includes('มหาดเล็กราชวัลลภที่2') ||
    normalized.includes('มหาดเล็ก2')
  ) {
    return 'กองทัพที่ 2 วัชรนาถ';
  }

  if (
    normalized.includes('ปุณฑริก') ||
    normalized.includes('ปุณทริก') ||
    normalized.includes('ทัพที่3') ||
    normalized.includes('มหาดเล็กราชวัลลภที่3') ||
    normalized.includes('มหาดเล็ก3')
  ) {
    return 'กองทัพที่ 3 ปุณฑริก';
  }

  if (
    normalized.includes('เกาโมทก') ||
    normalized.includes('ทัพที่4') ||
    normalized.includes('มหาดเล็กราชวัลลภที่4') ||
    normalized.includes('มหาดเล็ก4')
  ) {
    return 'กองทัพที่ 4 เกาโมทก';
  }

  // Also support matching plain number sequences
  if (normalized.includes('มหาดเล็ก') || normalized.includes('ราชวัลลภ')) {
    if (normalized.includes('1') || normalized.includes('๑')) {
      return 'กองทัพที่ 1 ปัญจะซันยะ';
    }
    if (normalized.includes('2') || normalized.includes('๒')) {
      return 'กองทัพที่ 2 วัชรนาถ';
    }
    if (normalized.includes('3') || normalized.includes('๓')) {
      return 'กองทัพที่ 3 ปุณฑริก';
    }
    if (normalized.includes('4') || normalized.includes('๔')) {
      return 'กองทัพที่ 4 เกาโมทก';
    }
  }

  return null;
}
