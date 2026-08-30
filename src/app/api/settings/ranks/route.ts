import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'rankSettings.json');



export async function GET() {
  try {
    if (!fs.existsSync(SETTINGS_FILE_PATH)) {
      return NextResponse.json({ thresholds: [] });
    }
    const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading rank settings:', error);
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Bug fix: Validate schema ก่อน write ไฟล์ ป้องกันข้อมูลผิดรูปแบบทำให้ระบบคำนวณยศพัง
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

    // Ensure the directory exists
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving rank settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
