import * as XLSX from 'xlsx';

/**
 * Parse a CSV/XLSX/XLS buffer into canonical import rows.
 *
 * @param {ArrayBuffer} buffer
 * @param {string} extension - '.csv', '.xlsx', or '.xls'
 * @param {(value: string) => string | null} matchDivisionFuzzy
 * @returns {{ rows: Array<{ player_name: string; division: string; total_score: number | null; position: string; source_row: number; raw_score: unknown }>; errors: string[] }}
 */
export function parseSpreadsheet(buffer, extension, matchDivisionFuzzy) {
  const errors = [];
  let workbook;

  if (extension === '.csv') {
    const utf8Decoder = new TextDecoder('utf-8');
    let text = utf8Decoder.decode(buffer);

    const thaiPattern = /[\u0e00-\u0e7f]/g;
    const utf8ThaiCount = (text.match(thaiPattern) || []).length;

    const tis874Decoder = new TextDecoder('windows-874');
    const tis874Text = tis874Decoder.decode(buffer);
    const tis874ThaiCount = (tis874Text.match(thaiPattern) || []).length;

    if (tis874ThaiCount > utf8ThaiCount) {
      text = tis874Text;
    }

    workbook = XLSX.read(text, { type: 'string' });
  } else {
    workbook = XLSX.read(buffer);
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawRows.length === 0) {
    errors.push('ไฟล์ว่างเปล่าหรือไม่มีข้อมูล');
    return { rows: [], errors };
  }

  let headerRowIndex = -1;
  let nameColIndex = -1;
  let scoreColIndex = -1;
  let divisionColIndex = -1;
  let positionColIndex = -1;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const valStr = String(row[j] || '').trim().toLowerCase();

      if (
        valStr === 'รายชื่อ' ||
        valStr === 'ชื่อผู้เล่น' ||
        valStr === 'ชื่อ' ||
        valStr === 'player_name' ||
        valStr === 'name' ||
        valStr === 'player' ||
        valStr.includes('ชื่อผู้เล่น') ||
        valStr.includes('รายชื่อ')
      ) {
        nameColIndex = j;
      } else if (
        valStr === 'แต้มใหม่' ||
        (scoreColIndex === -1 && (
          valStr === 'total_score' ||
          valStr === 'score' ||
          valStr === 'แต้มรวม' ||
          valStr === 'คะแนนรวม' ||
          valStr === 'แต้ม' ||
          valStr === 'คะแนน' ||
          valStr.includes('คะแนนสะสม') ||
          valStr.includes('แต้มใหม่') ||
          valStr.includes('แต้มทำงาน') ||
          (valStr.includes('แต้ม') && !valStr.includes('เก่า') && !valStr.includes('เดิม') && !valStr.includes('ต่าง') && !valStr.includes('ได้')) ||
          (valStr.includes('คะแนน') && !valStr.includes('เก่า') && !valStr.includes('เดิม') && !valStr.includes('ต่าง') && !valStr.includes('ได้'))
        ))
      ) {
        scoreColIndex = j;
      } else if (
        valStr === 'กอง' ||
        valStr === 'สังกัด' ||
        valStr === 'หน่วยงาน' ||
        valStr === 'division' ||
        valStr === 'ประเภท' ||
        valStr === 'กลุ่ม' ||
        valStr.includes('กองสังกัด') ||
        valStr.includes('สังกัด')
      ) {
        divisionColIndex = j;
      } else if (
        valStr === 'ตำแหน่ง' ||
        valStr === 'ยศ' ||
        valStr === 'ตำแหน่ง/ยศ' ||
        valStr === 'ยศ/ตำแหน่ง' ||
        valStr === 'position' ||
        valStr === 'rank' ||
        valStr.includes('ตำแหน่ง') ||
        valStr.includes('ยศ')
      ) {
        positionColIndex = j;
      }
    }

    if (nameColIndex !== -1) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    errors.push('ไม่พบแถวหัวตาราง (ต้องมีคอลัมน์ รายชื่อ/ชื่อผู้เล่น)');
    return { rows: [], errors };
  }

  if (scoreColIndex === -1) {
    scoreColIndex = nameColIndex + 2;
  }

  const rows = [];
  let currentDivision = '';

  // Pre-seed division context from any banner rows above the header.
  for (let i = 0; i <= headerRowIndex; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    for (let j = 0; j < Math.min(row.length, 3); j++) {
      const valStr = String(row[j] || '').trim();
      const fuzzyMatch = matchDivisionFuzzy(valStr);
      if (fuzzyMatch) {
        currentDivision = fuzzyMatch;
      }
    }
  }

  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;

    let matchedDivBanner = '';
    const rowNameValue = String(row[nameColIndex] || '').trim();
    const cleanPlayerName = rowNameValue.replace(/^\d+\.\s*/, '').trim();
    const isNameDivision = matchDivisionFuzzy(cleanPlayerName);

    if (!cleanPlayerName || isNameDivision) {
      for (let j = 0; j < Math.min(row.length, 3); j++) {
        const valStr = String(row[j] || '').trim();
        const fuzzyMatch = matchDivisionFuzzy(valStr);
        if (fuzzyMatch) {
          matchedDivBanner = fuzzyMatch;
          break;
        }
      }
    }

    if (matchedDivBanner) {
      currentDivision = matchedDivBanner;
      if (!rowNameValue) {
        continue;
      }
    }

    if (rowNameValue) {
      if (!cleanPlayerName) continue;

      if (matchDivisionFuzzy(cleanPlayerName)) {
        continue;
      }

      let playerDivision = '';
      if (divisionColIndex !== -1 && row[divisionColIndex]) {
        const divStr = String(row[divisionColIndex]).trim();
        const fuzzyMatch = matchDivisionFuzzy(divStr);
        if (fuzzyMatch) {
          playerDivision = fuzzyMatch;
        }
      }

      if (!playerDivision) {
        playerDivision = currentDivision;
      }

      rows.push({
        player_name: cleanPlayerName,
        division: playerDivision,
        total_score: null,
        position: positionColIndex !== -1 && row[positionColIndex] ? String(row[positionColIndex]).trim() : '',
        source_row: i + 1,
        raw_score: row[scoreColIndex],
      });
    }
  }

  return { rows, errors };
}
