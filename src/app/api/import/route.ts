import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';

interface CsvRow {
  player_name: string;
  division: string;
  total_score: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
}

function verifyAdmin(cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : never): boolean {
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return token === expectedHash;
}

function matchDivisionFuzzy(valStr: string): string | null {
  const normalized = valStr.replace(/\s+/g, '').replace(/[·\-\.]/g, '').toLowerCase();
  
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

function calculateDefaultPosition(score: number, division: string): string {
  if (division === 'กองทัพมหาเสือพิทักษ์') {
    return 'ทหารเสือประจำพระองค์';
  }
  if (division === 'กองทัพธรณินพิทักษ์') {
    return 'ทหารธรณินพิทักษ์';
  }
  if (division === 'กองทัพอาทมาต') {
    return 'หมื่นอาทมาต';
  }

  const isPolice = division === 'กองพระตำรวจหลวง';

  if (score >= 600) return isPolice ? 'พันตำรวจหลวง | Royal Police Colonel' : 'นายพันเวร | Battalion Commander of Guardsmen';
  if (score >= 315) return isPolice ? 'นายกองตำรวจหลวง | Royal Police Battalion Commander' : 'นายกองเวร | Company Head Guardsmen';
  if (score >= 210) return isPolice ? 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer' : 'นายหมวดเวร | Platoon Head Guardsmen';
  if (score >= 110) return isPolice ? 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader' : 'นายหมู่เวร | Squad Head Guardsmen';
  if (score >= 60) return isPolice ? 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper' : 'พลทหารยามอาวุโส | Senior Guardsmen';
  if (score >= 45) return isPolice ? 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper' : 'พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen';
  if (score >= 20) return isPolice ? 'พลประจำการตำรวจหลวง | Active Royal Police Trooper' : 'พลทหารยาม | Guardsmen';
  return isPolice ? 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)' : 'พลอาสาสมัครทหารยาม | Junior Guardsmen';
}


export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdmin(cookieStore)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

    let buffer: ArrayBuffer;
    let fileExtension = '';
    let fileName = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'A CSV or Excel file is required in the "file" field.' } satisfies ApiResponse<never>,
          { status: 400 }
        );
      }

      const allowedExtensions = ['.csv', '.xlsx', '.xls'];
      fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      fileName = file.name;
      
      if (!allowedExtensions.includes(fileExtension)) {
        return NextResponse.json(
          { error: 'Only CSV and Excel files (.csv, .xlsx, .xls) are accepted.' } satisfies ApiResponse<never>,
          { status: 400 }
        );
      }

      buffer = await file.arrayBuffer();
    } else {
      // Support JSON import with { url: string }
      const body = await request.json();
      const { url } = body;
      if (!url) {
        return NextResponse.json(
          { error: 'A URL parameter is required for remote import.' } satisfies ApiResponse<never>,
          { status: 400 }
        );
      }

      let finalUrl = url.trim();
      if (finalUrl.includes('onedrive.live.com') || finalUrl.includes('1drv.ms')) {
        const base64 = Buffer.from(finalUrl).toString('base64');
        const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        finalUrl = `https://api.onedrive.com/v1.0/shares/u!${encoded}/root/content`;
      }

      console.log('Fetching spreadsheet from URL:', finalUrl);
      const res = await fetch(finalUrl);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to download file from URL (Status: ${res.status}). Ensure the link is shared correctly.` } satisfies ApiResponse<never>,
          { status: 400 }
        );
      }

      buffer = await res.arrayBuffer();
      const contentDisposition = res.headers.get('content-disposition') || '';
      fileExtension = contentDisposition.includes('.csv') ? '.csv' : '.xlsx';
      fileName = 'OneDrive Remote File';
    }
    
    let workbook;
    if (fileExtension === '.csv') {
      const utf8Decoder = new TextDecoder('utf-8');
      let text = utf8Decoder.decode(buffer);
      
      const thaiPattern = /[\u0e00-\u0e7f]/g;
      const utf8ThaiCount = (text.match(thaiPattern) || []).length;
      
      const tis874Decoder = new TextDecoder('windows-874');
      const tis874Text = tis874Decoder.decode(buffer);
      const tis874ThaiCount = (tis874Text.match(thaiPattern) || []).length;
      
      console.log('UTF-8 Thai Count:', utf8ThaiCount);
      console.log('Windows-874 Thai Count:', tis874ThaiCount);
      
      if (tis874ThaiCount > utf8ThaiCount) {
        console.log('Using Windows-874 (TIS-620) decoding for CSV!');
        text = tis874Text;
      } else {
        console.log('Using UTF-8 decoding for CSV!');
      }
      
      workbook = XLSX.read(text, { type: 'string' });
    } else {
      workbook = XLSX.read(buffer);
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Parse as raw 2D array of rows to bypass title banners at the top of the sheet
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    console.log('--- IMPORT DEBUG ---');
    console.log('File Name:', fileName);
    console.log('Total raw rows parsed:', rawRows.length);
    console.log('Sample raw rows (first 40 rows):');
    rawRows.slice(0, 40).forEach((r, idx) => {
      console.log(`Row ${idx + 1}:`, JSON.stringify(r));
    });

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or contains no data rows.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    // 1. Find the header row by scanning each row until we find 'รายชื่อ' or 'ลำดับ'
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
        
        // Map player name column
        if (
          valStr === 'รายชื่อ' || 
          valStr === 'ชื่อผู้เล่น' || 
          valStr === 'ชื่อ' || 
          valStr === 'player_name' || 
          valStr === 'name' || 
          valStr === 'player'
        ) {
          nameColIndex = j;
        } 
        // Map score column
        else if (
          valStr === 'แต้มใหม่' || 
          valStr === 'total_score' || 
          valStr === 'score' || 
          valStr === 'แต้มรวม' || 
          valStr === 'คะแนนรวม' || 
          valStr === 'แต้ม' ||
          valStr === 'คะแนน' ||
          valStr === 'แต้มการทำงาน' ||
          valStr === 'คะแนนการทำงาน'
        ) {
          scoreColIndex = j;
        }
        // Map division column
        else if (
          valStr === 'กอง' ||
          valStr === 'สังกัด' ||
          valStr === 'หน่วยงาน' ||
          valStr === 'division' ||
          valStr === 'ประเภท' ||
          valStr === 'กลุ่ม'
        ) {
          divisionColIndex = j;
        }
        // Map position/rank column
        else if (
          valStr === 'ตำแหน่ง' ||
          valStr === 'ยศ' ||
          valStr === 'ตำแหน่ง/ยศ' ||
          valStr === 'ยศ/ตำแหน่ง' ||
          valStr === 'position' ||
          valStr === 'rank'
        ) {
          positionColIndex = j;
        }
      }

      if (nameColIndex !== -1) {
        headerRowIndex = i;
        break;
      }
    }

    console.log('Detected indices BEFORE fallback:');
    console.log(' - headerRowIndex:', headerRowIndex);
    console.log(' - nameColIndex:', nameColIndex);
    console.log(' - scoreColIndex:', scoreColIndex);
    console.log(' - divisionColIndex:', divisionColIndex);

    // Fallback if we couldn't find the header row explicitly
    if (headerRowIndex === -1) {
      nameColIndex = 1; // Assume Column B (index 1) has player names
      scoreColIndex = 3; // Assume Column D (index 3) has scores (แต้มใหม่)
      headerRowIndex = 0;
      console.log('Applied fallback: headerRowIndex = 0, nameColIndex = 1, scoreColIndex = 3');
    }

    // Fallback if score index is missing but we found name
    if (scoreColIndex === -1) {
      scoreColIndex = nameColIndex + 2; // Usually total_score is 2 columns after name
      console.log('Applied score index fallback:', scoreColIndex);
    }

    console.log('Final parsing indices:');
    console.log(' - headerRowIndex:', headerRowIndex);
    console.log(' - nameColIndex:', nameColIndex);
    console.log(' - scoreColIndex:', scoreColIndex);
    console.log(' - divisionColIndex:', divisionColIndex);

    const rows: any[] = [];
    let currentDivision = '';
    const processedCountPerDivision = new Map<string, number>();

    // 2. Parse all data rows below the header row
    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;

      // Check if this row contains a division name
      let matchedDivBanner = '';
      const rowNameValue = String(row[nameColIndex] || '').trim();
      
      for (let j = 0; j < row.length; j++) {
        const valStr = String(row[j] || '').trim();
        const fuzzyMatch = matchDivisionFuzzy(valStr);
        if (fuzzyMatch) {
          matchedDivBanner = fuzzyMatch;
          break;
        }
      }

      if (matchedDivBanner) {
        // Always update the division context to this new division!
        currentDivision = matchedDivBanner;
        console.log(`[Row ${i + 1}] Division Context Updated to: "${matchedDivBanner}"`);
        
        // Skip player extraction ONLY if there is no valid player name in this row
        if (!rowNameValue) {
          continue; 
        }
      }

      // If we have a player name, parse the player row
      if (rowNameValue) {
        // Skip if the player name cell itself contains a division keyword
        const cleanPlayerName = rowNameValue.replace(/^\d+\.\s*/, '').trim();
        if (!cleanPlayerName) continue;

        if (matchDivisionFuzzy(cleanPlayerName)) {
          console.log(`[Row ${i + 1}] Skipped row as player name cell matches a division name: "${rowNameValue}"`);
          continue;
        }

        // Determine division
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

        // Parse score
        const scoreVal = row[scoreColIndex];
        let rawScore = 0;
        if (typeof scoreVal === 'number') {
          rawScore = scoreVal;
        } else {
          const parsedFloat = parseFloat(String(scoreVal || '0').replace(/,/g, ''));
          rawScore = isNaN(parsedFloat) ? 0 : parsedFloat;
        }
        
        // Keep decimal score to store in Supabase DOUBLE PRECISION
        const totalScore = rawScore;

        // Parse custom position from sheet if available
        let customPosition = '';
        if (positionColIndex !== -1 && row[positionColIndex]) {
          customPosition = String(row[positionColIndex]).trim();
          
          // If the player is in กองพระตำรวจหลวง, translate any generic military ranks to police ranks
          if (playerDivision === 'กองพระตำรวจหลวง' && customPosition) {
            if (customPosition.includes('ครูฝึกทหารราชองครักษ์') || customPosition.includes('Drill Master of the Royal Guards')) {
              customPosition = 'ครูฝึกตำรวจหลวง สายทอง | Royal Police Instructor (Golden Line)';
            } else if (customPosition.startsWith('นายพันเวร')) {
              customPosition = 'พันตำรวจหลวง | Royal Police Colonel';
            } else if (customPosition.startsWith('นายกองเวร')) {
              customPosition = 'นายกองตำรวจหลวง | Royal Police Battalion Commander';
            } else if (customPosition.startsWith('นายหมวดเวร')) {
              customPosition = 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer';
            } else if (customPosition.startsWith('นายหมู่เวร')) {
              customPosition = 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader';
            } else if (customPosition.startsWith('พลทหารยามอาวุโส')) {
              customPosition = 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper';
            } else if (customPosition.startsWith('พลทหารราชวัลลภพิเศษ')) {
              customPosition = 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper';
            } else if (customPosition.startsWith('พลทหารยาม')) {
              customPosition = 'พลประจำการตำรวจหลวง | Active Royal Police Trooper';
            } else if (customPosition.startsWith('พลอาสาสมัครทหารยาม')) {
              customPosition = 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)';
            }
          }
        }

        const calculatedPos = customPosition || calculateDefaultPosition(totalScore, playerDivision);

        const extractedPlayer = {
          player_name: cleanPlayerName,
          division: playerDivision,
          total_score: totalScore,
          position: calculatedPos,
          row_index: i + 1 // Excel row number is 1-indexed
        };
        
        rows.push(extractedPlayer);
        console.log(`[Row ${i + 1}] Extracted Player:`, JSON.stringify(extractedPlayer));
      } else {
        // Log if there was some content that was ignored
        const rowStr = JSON.stringify(row);
        if (rowStr.length > 4 && rowStr !== '[]') {
          console.log(`[Row ${i + 1}] Ignored row: ${rowStr}`);
        }
      }
    }

    console.log('--- END OF EXTRACTION ---');
    console.log('Total extracted players:', rows.length);
    console.log('Sample parsed players (first 5):', JSON.stringify(rows.slice(0, 5)));

    const adminClient = createAdminClient();

    // Create the import session record first
    const { data: newImport, error: importSessionError } = await adminClient
      .from('imports')
      .insert({
        filename: fileName || 'OneDrive Remote File',
        imported_count: 0,
        updated_count: 0
      })
      .select('id')
      .single();

    if (importSessionError) {
      console.error('Failed to create import session:', importSessionError);
      return NextResponse.json(
        { error: `ล้มเหลวในการเริ่มต้นเซสชันนำเข้า: ${importSessionError.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    const importId = newImport.id;
    const logsToInsert: {
      import_id: string;
      player_name: string;
      division: string;
      old_score: number;
      new_score: number;
      score_diff: number;
    }[] = [];

    // 1. Fetch all existing players from the database first for comparison
    const { data: existingDbPlayers, error: fetchAllError } = await adminClient
      .from('players')
      .select('id, player_name, division, total_score, position, starting_score');

    if (fetchAllError) {
      console.error('Failed to fetch existing players for comparison:', fetchAllError);
      return NextResponse.json(
        { error: `ล้มเหลวในการอ่านข้อมูลเดิมเพื่อเปรียบเทียบ: ${fetchAllError.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    const dbPlayerMap = new Map<string, typeof existingDbPlayers[number]>();
    existingDbPlayers?.forEach((p) => {
      dbPlayerMap.set(`${p.player_name}_${p.division}`, p);
    });

    let imported = 0;
    let updated = 0;
    const errors: string[] = [];
    const processedKeys = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = row.row_index;

      const playerName = row.player_name;
      let division = row.division;
      const totalScore = row.total_score;

      if (!playerName) {
        errors.push(`แถวที่ ${rowIndex}: ไม่พบชื่อผู้เล่น (player_name ห้ามว่าง)`);
        continue;
      }

      // Map division variations using fuzzy matcher
      const fuzzyMatch = matchDivisionFuzzy(division);
      if (fuzzyMatch) {
        division = fuzzyMatch;
      }

      const validDivisions = [
        'กองทัพมหาเสือพิทักษ์',
        'กองทัพธรณินพิทักษ์',
        'กองทัพอาทมาต',
        'กองพระตำรวจหลวง',
        'กองทัพที่ 1 ปัญจะซันยะ',
        'กองทัพที่ 2 วัชรนาถ',
        'กองทัพที่ 3 ปุณฑริก',
        'กองทัพที่ 4 เกาโมทก'
      ];

      if (!validDivisions.includes(division)) {
        errors.push(`แถวที่ ${rowIndex}: ชื่อกองไม่ถูกต้อง (${division ? `'${division}'` : 'ไม่มีชื่อกอง'}) กองที่อนุญาตคือ: ธรณินพิทักษ์, มหาเสือพิทักษ์, อาทมาต, พระตำรวจหลวง, กองทัพ 1-4`);
        continue;
      }

      if (isNaN(totalScore)) {
        errors.push(`แถวที่ ${rowIndex}: คะแนนรวมไม่ถูกต้อง (${row.total_score || 'ว่าง'}) ต้องเป็นตัวเลขหรือทศนิยมเท่านั้น`);
        continue;
      }

      const key = `${playerName}_${division}`;
      processedKeys.add(key);

      try {
        const existingPlayer = dbPlayerMap.get(key);

        if (existingPlayer) {
          const oldScore = existingPlayer.total_score;
          const scoreDiff = totalScore - oldScore;

          // Generate a sequential created_at to preserve exact Excel ordering
          const baseTime = new Date('2026-05-27T00:00:00Z').getTime();
          const sequentialCreatedAt = new Date(baseTime + rowIndex * 1000).toISOString();

          // We ALWAYS update created_at to match Excel's exact row order!
          // We also update score, position, and latest_change.
          const { error: updateError } = await adminClient
            .from('players')
            .update({ 
              total_score: totalScore,
              position: row.position,
              latest_change: oldScore !== totalScore ? scoreDiff : 0,
              created_at: sequentialCreatedAt
            })
            .eq('id', existingPlayer.id);

          if (updateError) {
            errors.push(`Row ${rowIndex}: Update failed — ${updateError.message}`);
            continue;
          }

          if (oldScore !== totalScore) {
            const { error: historyError } = await adminClient
              .from('score_history')
              .insert({
                player_id: existingPlayer.id,
                old_score: oldScore,
                new_score: totalScore,
                score_diff: scoreDiff,
              });

            if (historyError) {
              errors.push(`Row ${rowIndex}: Score updated but history insert failed — ${historyError.message}`);
            }

            // Save delta for this import log
            logsToInsert.push({
              import_id: importId,
              player_name: playerName,
              division,
              old_score: oldScore,
              new_score: totalScore,
              score_diff: scoreDiff
            });

            updated++;
          }
        } else {
          // Insert new player with sequential created_at, position, starting_score, and latest_change = 0
          const baseTime = new Date('2026-05-27T00:00:00Z').getTime();
          const sequentialCreatedAt = new Date(baseTime + rowIndex * 1000).toISOString();

          const { error: insertError } = await adminClient
            .from('players')
            .insert({
              player_name: playerName,
              division,
              total_score: totalScore,
              position: row.position,
              starting_score: totalScore,
              latest_change: 0,
              created_at: sequentialCreatedAt
            });

          if (insertError) {
            errors.push(`Row ${rowIndex}: Insert failed — ${insertError.message}`);
            continue;
          }

          // New player counts as delta change equal to their starting score
          logsToInsert.push({
            import_id: importId,
            player_name: playerName,
            division,
            old_score: 0,
            new_score: totalScore,
            score_diff: totalScore
          });

          imported++;
        }
      } catch (rowErr) {
        errors.push(`Row ${rowIndex}: Unexpected error — ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
      }
    }

    // 2. Clear out old players from database who are NOT in the spreadsheet
    const idsToDelete = existingDbPlayers
      .filter((p) => !processedKeys.has(`${p.player_name}_${p.division}`))
      .map((p) => p.id);

    if (idsToDelete.length > 0) {
      console.log(`Deleting ${idsToDelete.length} players not present in spreadsheet...`);
      const { error: deleteOldError } = await adminClient
        .from('players')
        .delete()
        .in('id', idsToDelete);

      if (deleteOldError) {
        console.error('Failed to delete players not in sheet:', deleteOldError);
        errors.push(`ล้มเหลวในการลบรายชื่อทหารที่ไม่มีอยู่ในไฟล์: ${deleteOldError.message}`);
      }
    }

    // Write all player delta logs for this import session in batch
    if (logsToInsert.length > 0) {
      const { error: logsInsertError } = await adminClient
        .from('import_logs')
        .insert(logsToInsert);
      if (logsInsertError) {
        console.error('Failed to insert import logs in batch:', logsInsertError);
        errors.push(`ล้มเหลวในการบันทึกประวัติแต้มรายบุคคลของการอัปโหลดครั้งนี้: ${logsInsertError.message}`);
      }
    }

    // Update the final import session stats
    const { error: updateImportCountsError } = await adminClient
      .from('imports')
      .update({
        imported_count: imported,
        updated_count: updated
      })
      .eq('id', importId);

    if (updateImportCountsError) {
      console.error('Failed to update import session counts:', updateImportCountsError);
    }

    return NextResponse.json({
      data: { imported, updated, errors, import_id: importId },
    } satisfies ApiResponse<ImportResult & { import_id: string }>);
  } catch (err) {
    console.error('Unexpected error in POST /api/import:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

