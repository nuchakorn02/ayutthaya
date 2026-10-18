import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createAdminClient } from '@/lib/supabase/server';
import { calculateDefaultPosition } from '@/lib/positionUtils';
import { sendDiscordWebhook } from '@/lib/discord';
import type { ApiResponse } from '@/lib/types';
import { autoReconcileScores } from '@/lib/import/reconcile';
import { matchDivisionFuzzy } from '@/lib/import/divisionMatcher';

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




export async function POST(request: NextRequest) {
  try {
    

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

      // S2 Fix: ป้องกัน DoS จากไฟล์ขนาดใหญ่ — จำกัดไว้ที่ 10MB
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `ขนาดไฟล์ต้องไม่เกิน 10MB (ไฟล์ที่อัปโหลดมีขนาด ${(file.size / 1024 / 1024).toFixed(1)}MB)` } satisfies ApiResponse<never>,
          { status: 413 }
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
        // Fix: ใช้ &download=1 แทน api.onedrive.com/v1.0 ที่ Microsoft ปิดไปแล้ว
        // รองรับทั้งลิงก์รูปแบบเก่า (onedrive.live.com) และใหม่ (1drv.ms/x/c/...)
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}download=1`;
        console.log('[OneDrive] Using download=1 approach:', finalUrl);
      }

      console.log('Fetching spreadsheet from URL:', finalUrl);
      const res = await fetch(finalUrl, {
        headers: {
          // ส่ง User-Agent เพื่อป้องกันการถูก block โดย CDN บางตัว
          'User-Agent': 'Mozilla/5.0 (compatible; LeaderboardBot/1.0)'
        },
        redirect: 'follow'
      });

      // ถ้า download=1 ยังได้ HTML กลับมา (viewer page) ให้ลอง Graph API
      const resContentType = res.headers.get('content-type') || '';
      const isHtmlResponse = resContentType.includes('text/html');

      if (!res.ok || isHtmlResponse) {
        // Fallback: ลอง Microsoft Graph API สำหรับ public sharing links
        if (url.includes('onedrive.live.com') || url.includes('1drv.ms')) {
          try {
            const base64 = Buffer.from(url.trim()).toString('base64');
            const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const graphUrl = `https://graph.microsoft.com/v1.0/shares/u!${encoded}/driveItem/content`;
            console.log('[OneDrive] Falling back to Graph API:', graphUrl);

            const graphRes = await fetch(graphUrl, { redirect: 'follow' });
            if (graphRes.ok) {
              buffer = await graphRes.arrayBuffer();
              fileExtension = '.xlsx';
              fileName = 'OneDrive Remote File';
            } else {
              return NextResponse.json(
                { error: `ดึงไฟล์จาก OneDrive ไม่สำเร็จ (${graphRes.status}) — กรุณาตรวจสอบว่าไฟล์ถูกแชร์แบบ "ทุกคนที่มีลิงก์" แล้ว` } satisfies ApiResponse<never>,
                { status: 400 }
              );
            }
          } catch (graphErr) {
            return NextResponse.json(
              { error: 'ดึงไฟล์จาก OneDrive ไม่สำเร็จ — กรุณาตรวจสอบว่าไฟล์ถูกแชร์แบบ "ทุกคนที่มีลิงก์" แล้ว' } satisfies ApiResponse<never>,
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: `ดาวน์โหลดไฟล์ไม่สำเร็จ (Status: ${res.status}) — กรุณาตรวจสอบว่า URL สามารถเข้าถึงได้สาธารณะ` } satisfies ApiResponse<never>,
            { status: 400 }
          );
        }
      } else {
        buffer = await res.arrayBuffer();
      }

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
          valStr === 'player' ||
          valStr.includes('ชื่อผู้เล่น') ||
          valStr.includes('รายชื่อ')
        ) {
          nameColIndex = j;
        } 
        // Map score column (New Score / Total Score)
        else if (
          valStr === 'แต้มใหม่' || 
          valStr === 'total_score' || 
          valStr === 'score' || 
          valStr === 'แต้มรวม' || 
          valStr === 'คะแนนรวม' || 
          valStr === 'แต้ม' ||
          valStr === 'คะแนน' ||
          valStr === 'แต้มการทำงาน' ||
          valStr === 'คะแนนการทำงาน' ||
          valStr.includes('คะแนนสะสม') ||
          valStr.includes('แต้มใหม่') ||
          valStr.includes('แต้มทำงาน') ||
          (valStr.includes('แต้ม') && !valStr.includes('เก่า') && !valStr.includes('เดิม') && !valStr.includes('ต่าง') && !valStr.includes('ได้')) ||
          (valStr.includes('คะแนน') && !valStr.includes('เก่า') && !valStr.includes('เดิม') && !valStr.includes('ต่าง') && !valStr.includes('ได้'))
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
          valStr === 'กลุ่ม' ||
          valStr.includes('กองสังกัด') ||
          valStr.includes('สังกัด')
        ) {
          divisionColIndex = j;
        }
        // Map position/rank column (handles decomposed Thai U+0E33 vowels in 'ตำแหน่ง')
        else if (
          valStr === 'ตำแหน่ง' ||
          valStr === 'ยศ' ||
          valStr === 'ตำแหน่ง/ยศ' ||
          valStr === 'ยศ/ตำแหน่ง' ||
          valStr === 'position' ||
          valStr === 'rank' ||
          valStr.includes('ตำแหน่ง') ||
          valStr.includes('ยศ') ||
          valStr.includes('ตำ') ||
          valStr.includes('แหน่ง')
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
    console.log(' - positionColIndex:', positionColIndex);

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

    // Default to Column N (index 13) for position if not matched
    if (positionColIndex === -1) {
      positionColIndex = 13;
      console.log('Applied position index fallback:', positionColIndex);
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

      // Check if this row contains a division banner
      // Banners are rows that either have no player name, or the player name cell itself matches a division name.
      let matchedDivBanner = '';
      const rowNameValue = String(row[nameColIndex] || '').trim();
      const cleanPlayerName = rowNameValue.replace(/^\d+\.\s*/, '').trim();
      const isNameDivision = matchDivisionFuzzy(cleanPlayerName);

      if (!cleanPlayerName || isNameDivision) {
        // Scan the first few cells of the row for a division banner match
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
    const dbPlayerByNameMap = new Map<string, typeof existingDbPlayers[number]>();
    existingDbPlayers?.forEach((p) => {
      dbPlayerMap.set(`${p.player_name}_${p.division}`, p);
      dbPlayerByNameMap.set(p.player_name, p);
    });

    let imported = 0;
    let updated = 0;
    const errors: string[] = [];
    const processedKeys = new Set<string>();
    const processedNamesInFile = new Set<string>();
    const processedIds = new Set<string>();

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
        'คณะผู้บริหาร',
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
        errors.push(`แถวที่ ${rowIndex}: ชื่อกองไม่ถูกต้อง (${division ? `'${division}'` : 'ไม่มีชื่อกอง'}) กองที่อนุญาตคือ: คณะผู้บริหาร, ธรณินพิทักษ์, มหาเสือพิทักษ์, อาทมาต, พระตำรวจหลวง, กองทัพ 1-4`);
        continue;
      }

      if (isNaN(totalScore)) {
        errors.push(`แถวที่ ${rowIndex}: คะแนนรวมไม่ถูกต้อง (${row.total_score || 'ว่าง'}) ต้องเป็นตัวเลขหรือทศนิยมเท่านั้น`);
        continue;
      }

      const fileKey = `${playerName}_${division}`;
      
      // Smart Validation: Detect duplicates within the uploaded file
      if (processedNamesInFile.has(playerName)) {
        errors.push(`[แจ้งเตือน] แถวที่ ${rowIndex}: พบชื่อผู้เล่น "${playerName}" ซ้ำซ้อนในไฟล์อัปโหลด คะแนนและตำแหน่งจะถูกอัปเดตทับข้อมูลแถวก่อนหน้า`);
      }
      processedNamesInFile.add(playerName);
      processedKeys.add(fileKey);

      try {
        let existingPlayer = dbPlayerMap.get(fileKey);
        let isDivisionTransfer = false;
        let oldDivision = '';

        // Conflict Resolve: If no exact match by name + division, check if player exists in DB under another division
        if (!existingPlayer) {
          const matchedByName = dbPlayerByNameMap.get(playerName);
          if (matchedByName) {
            existingPlayer = matchedByName;
            isDivisionTransfer = true;
            oldDivision = matchedByName.division;
            errors.push(`[ย้ายสังกัด] แถวที่ ${rowIndex}: ย้ายทหาร "${playerName}" จาก "${oldDivision}" ไปยัง "${division}" (สืบทอดและเก็บรักษาประวัติคะแนนเดิมสำเร็จ)`);
          }
        }

        if (existingPlayer) {
          // Track this ID as processed so it won't be deleted at the end!
          processedIds.add(existingPlayer.id);

          const oldScore = existingPlayer.total_score;
          let scoreDiff = totalScore - oldScore;
          
          // Fix for restoring retired players: prevent massive scoreDiff (+1099)
          if (oldScore === -999) {
            // ดึงคะแนนเดิมก่อนที่จะโดน -999 จากประวัติล่าสุด
            const { data: lastHistory } = await adminClient
              .from('score_history')
              .select('old_score')
              .eq('player_id', existingPlayer.id)
              .eq('new_score', -999)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastHistory && lastHistory.old_score !== null) {
              scoreDiff = totalScore - lastHistory.old_score;
            } else {
              scoreDiff = 0;
            }
          }

          // Generate a sequential created_at to preserve exact Excel ordering
          const baseTime = new Date('2026-05-27T00:00:00Z').getTime();
          const sequentialCreatedAt = new Date(baseTime + rowIndex * 1000).toISOString();

          // Prepare payload — only update latest_change if score actually changed.
          // This preserves latest_change values from manual PATCH operations when score is unchanged.
          const updatePayload: any = {
            total_score: totalScore,
            position: row.position,
            created_at: sequentialCreatedAt
          };

          if (oldScore !== totalScore) {
            updatePayload.latest_change = scoreDiff;
          }

          if (isDivisionTransfer) {
            updatePayload.division = division;
          }

          const { error: updateError } = await adminClient
            .from('players')
            .update(updatePayload)
            .eq('id', existingPlayer.id);

          if (updateError) {
            errors.push(`แถวที่ ${rowIndex}: อัปเดตข้อมูลผู้เล่นล้มเหลว — ${updateError.message}`);
            continue;
          }

          // If score changed OR division changed, insert history
          if (oldScore !== totalScore || isDivisionTransfer) {
            const { error: historyError } = await adminClient
              .from('score_history')
              .insert({
                player_id: existingPlayer.id,
                old_score: oldScore,
                new_score: totalScore,
                score_diff: scoreDiff,
              });

            if (historyError) {
              errors.push(`แถวที่ ${rowIndex}: อัปเดตคะแนนเรียบร้อย แต่การบันทึกประวัติแต้มขัดข้อง — ${historyError.message}`);
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
          // Insert new player — set latest_change = totalScore so badge shows on first import
          const baseTime = new Date('2026-05-27T00:00:00Z').getTime();
          const sequentialCreatedAt = new Date(baseTime + rowIndex * 1000).toISOString();

          const { data: newInsertedPlayer, error: insertError } = await adminClient
            .from('players')
            .insert({
              player_name: playerName,
              division,
              total_score: totalScore,
              position: row.position,
              starting_score: totalScore,
              latest_change: totalScore,
              created_at: sequentialCreatedAt
            })
            .select('id')
            .single();

          if (insertError) {
            errors.push(`แถวที่ ${rowIndex}: เพิ่มรายชื่อทหารใหม่ล้มเหลว — ${insertError.message}`);
            continue;
          }

          if (newInsertedPlayer) {
            processedIds.add(newInsertedPlayer.id);

            // สร้าง score_history สำหรับผู้เล่นใหม่ เพื่อให้ timeline ประวัติแสดงได้
            if (totalScore > 0) {
              const { error: historyError } = await adminClient
                .from('score_history')
                .insert({
                  player_id: newInsertedPlayer.id,
                  old_score: 0,
                  new_score: totalScore,
                  score_diff: totalScore,
                });
              if (historyError) {
                console.error(`Failed to insert score_history for new player ${playerName}:`, historyError);
              }
            }
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
        errors.push(`แถวที่ ${rowIndex}: เกิดข้อผิดพลาดที่ไม่คาดคิด — ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
      }
    }

    // 2. Soft delete players who are not in the uploaded spreadsheet.
    const playersToSoftDelete = existingDbPlayers
      .filter((p) => !processedIds.has(p.id))
      .filter((p) => p.division !== 'ปลดประจำการ'); // Don't re-delete

    for (const p of playersToSoftDelete) {
      const { error: updateErr } = await adminClient
        .from('players')
        // Medium fix: เพิ่ม total_score: -999 ให้ consistent กับการกดปุ่มพ้นสภาพจาก UI
        .update({ division: 'ปลดประจำการ', total_score: -999 })
        .eq('id', p.id);

      if (!updateErr) {
        // Log this soft delete so Rollback knows their original division
        logsToInsert.push({
          import_id: importId,
          player_name: p.player_name,
          division: p.division, // Save original division here!
          old_score: p.total_score,
          new_score: -999, // Magic flag indicating soft delete
          score_diff: 0
        });
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

    // Run auto-reconciliation to guarantee history integrity for all players
    await autoReconcileScores(adminClient);

    // Send Discord Webhook notification in background
    (async () => {
      try {
        const fields = [
          { name: '💂 ทหารใหม่เข้ากรม', value: `\`+${imported}\` คน`, inline: true },
          { name: '📈 คนที่โดนปรับแต้มรอบนี้', value: `\`${updated}\` คน`, inline: true },
        ];

        const embed = {
          title: '📢 อัปเดตแต้มล่าสุดมาแล้วจ้า!',
          description: 'แอดมินจัดการปรับแต้มและอัปเดตรายชื่อให้เรียบร้อยแล้วน้า ทุกคนสามารถเข้าไปเช็คยศและคะแนนล่าสุดของตัวเองที่หน้าเว็บได้เลย!',
          color: 13938487, // Gold #D4AF37
          fields: fields,
          timestamp: new Date().toISOString(),
          footer: {
            text: 'ระบบแต้มกรมทหารราชวัลลภ',
            icon_url: 'https://omlbtybplmeryoigwmac.supabase.co/storage/v1/object/public/public_assets/logo.png'
          }
        };

        await sendDiscordWebhook({
          content: process.env.DISCORD_IMPORT_TEMPLATE || '',
          embeds: [embed]
        });
      } catch (err) {
        console.error('Failed to send Discord webhook:', err);
      }
    })();

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

