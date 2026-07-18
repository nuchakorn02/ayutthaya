function matchDivisionFuzzy(valStr) {
  const normalized = valStr.replace(/\s+/g, '').replace(/[·\-\.]/g, '').toLowerCase();
  
  if (normalized.includes('คณะผู้บริหาร') || normalized.includes('ผู้บริหาร') || normalized.includes('คณะบริหาร') || normalized.includes('บริหาร')) {
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
  return null;
}

const mockRows = [
  // Row 14 (DXDNINE)
  [ "1", "DXDNINE", "2", "3", "1", null, null, null, null, null, null, null, null, "พระยามหาเสือ" ],
  // Row 15 (PXKT13)
  [ "2", "1. PXKT13", "7", "7", "0", null, null, null, null, null, null, null, null, null ],
  // Row 16 (heyitmeflame_15554)
  [ "3", "2. heyitmeflame_15554", "42.5", "42.5", "0", null, null, null, null, null, null, null, null, null ],
  // Row 17 (two25156)
  [ "4", "3. two25156", "26.5", "27.5", "1", null, null, null, null, null, null, null, null, null ],
  // Row 18 (Feiwmd7)
  [ "5", "4. Feiwmd7", "28", "29.5", "1.5", null, null, null, null, null, null, null, null, null ],
  // Row 19 (chong3556)
  [ "6", "5. chong3556", "0", "0", "0", null, null, null, null, null, null, null, null, null ]
];

let currentDivision = 'กองทัพมหาเสือพิทักษ์';
mockRows.forEach((row, idx) => {
  const rowIndex = idx + 14;
  let matchedDivBanner = '';
  const rowNameValue = String(row[1] || '').trim();

  for (let j = 0; j < row.length; j++) {
    const valStr = String(row[j] || '').trim();
    const fuzzyMatch = matchDivisionFuzzy(valStr);
    if (fuzzyMatch) {
      matchedDivBanner = fuzzyMatch;
      break;
    }
  }

  if (matchedDivBanner) {
    currentDivision = matchedDivBanner;
  }

  console.log(`Row ${rowIndex}: Name="${rowNameValue}" | MatchedBanner="${matchedDivBanner}" | ActiveDivision="${currentDivision}"`);
});
