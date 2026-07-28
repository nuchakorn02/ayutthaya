// SECURITY: Endpoint นี้ถูก disable แล้ว migration เสร็จสิ้นไปแล้ว
// ห้ามเปิดใช้งานอีกโดยไม่มีการ auth ที่แข็งแกร่ง
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint has been disabled.' },
    { status: 410 }
  );
}
