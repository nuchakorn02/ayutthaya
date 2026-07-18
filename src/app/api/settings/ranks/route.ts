import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'rankSettings.json');

function verifyAdmin(cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : never): boolean {
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return token === expectedHash;
}

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
    const cookieStore = await cookies();
    if (!verifyAdmin(cookieStore)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
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
