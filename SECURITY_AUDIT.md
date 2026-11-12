# Security Audit

**วันที่ตรวจ:** 2026-11-12  
**ขอบเขต:** ขั้นที่ 1 ตามแผนงาน — ตรวจสอบแบบอ่านอย่างเดียว; การแก้ Source ภายหลังทำเฉพาะตามการอนุมัติแยกต่างหาก ไม่แก้ Migration, Environment Variables หรือ Production  
**สถานะ:** อัปเดตผลตรวจและการแก้ไข Source ที่ได้รับอนุมัติ; CRITICAL ยังเปิดอยู่เพราะ credential อยู่ใน Git history และ MEDIUM ต้องตรวจสอบ log ย้อนหลัง  
**Branch ณ เวลาตรวจ:** `main` (`origin/main`, commit `64f1fbc`)  
**Working tree:** ก่อนตรวจมีไฟล์ untracked 5 รายการและไม่มี tracked changes; หลังการแก้ตามอนุมัติ เปลี่ยน utility scripts 15 ไฟล์และ Import API, เพิ่ม helper/tests สำหรับทั้งสองประเด็น และอัปเดตรายงานนี้ ส่วน untracked plan/spec เดิมอื่นไม่ได้แก้ไขหรือลบ

## Executive Summary

พบประเด็นที่ต้องดำเนินการ 2 รายการ:

1. **CRITICAL:** พบ Supabase JWT ที่มี role `service_role` ใน Git history; นำค่าออกจากสคริปต์ปัจจุบันแล้ว แต่ยังไม่ยืนยันการ Rotate/Revoke
2. **MEDIUM:** Import API เคยบันทึก URL เต็มและ Graph URL ที่มี URL ต้นฉบับใน Base64; แก้ให้ log เฉพาะ URL origin แล้ว แต่ยังไม่ได้ตรวจสอบหรือทำความสะอาด Hosting Logs ย้อนหลัง

การตรวจครั้งแรกเป็น Static Review และไม่เชื่อมต่อ Production; การแก้ Source ที่ระบุในส่วนท้ายทำภายหลังตามการอนุมัติ และทดสอบเฉพาะในเครื่อง รายงานนี้ยังไม่ยืนยันการใช้ key, สิทธิ์ที่ deploy อยู่ หรือเนื้อหาและการเก็บรักษา Hosting Logs

## Findings

### CRITICAL — Supabase `service_role` credential ถูกฝังในไฟล์และ Git history

- **ความเชื่อมั่น:** 9/10
- **หลักฐาน:** สคริปต์ที่ถูก track ต่อไปนี้มี credential ประเภทเดียวกันที่มี role `service_role`; พบ credential ใน Git history ที่เข้าถึงได้ รวมถึง commit `a3be188`
  - [`query_db.js`](./query_db.js:4)
  - [`scratch/check_db.js`](./scratch/check_db.js:4)
  - [`scratch/check_dns.js`](./scratch/check_dns.js:21)
  - [`scratch/check_headers.js`](./scratch/check_headers.js:3)
  - [`scratch/check_history.js`](./scratch/check_history.js:5)
  - [`scratch/check_spec.js`](./scratch/check_spec.js:3)
  - [`scratch/check_timestamps.js`](./scratch/check_timestamps.js:4)
  - [`scratch/fix_chong_db.js`](./scratch/fix_chong_db.js:4)
  - [`scratch/get_schema.js`](./scratch/get_schema.js:3)
  - [`scratch/inspect_import.js`](./scratch/inspect_import.js:4)
  - [`scratch/query_all_created_at.js`](./scratch/query_all_created_at.js:4)
  - [`scratch/query_chong.js`](./scratch/query_chong.js:4)
  - [`scratch/query_logs.js`](./scratch/query_logs.js:4)
  - [`scratch/query_players.js`](./scratch/query_players.js:4)
  - [`scratch/test_imports_table.js`](./scratch/test_imports_table.js:4)
- **ผลกระทบ/สถานการณ์:** ผู้ที่เข้าถึง Repository หรือสำเนาใน Git history อาจนำ credential ไปเรียก Supabase ด้วยสิทธิ์สูง ซึ่งสามารถข้าม RLS และอ่านหรือแก้ไขข้อมูลได้ การลบค่าออกจากไฟล์ปัจจุบันอย่างเดียวไม่ทำให้สำเนาเดิมใน history ปลอดภัย
- **ข้อควรระวังเพิ่มเติม:** [`query_db.js`](./query_db.js:10) เรียกการลบข้อมูลจากตาราง `players` ด้วย credential ดังกล่าว สคริปต์นี้ไม่ได้ถูกรัน; การนำ credential ไป Environment Variables ไม่ได้ทำให้การทำงานแบบลบข้อมูลปลอดภัยขึ้น ควรตรวจสอบเจตนาและกำหนดการป้องกันก่อนอนุญาตให้ใช้งาน
- **สถานะ:** แก้ไข Source แล้วโดยนำ credential literals ออกจากสคริปต์ปัจจุบันทั้ง 15 ไฟล์และเปลี่ยนให้อ่านค่าจาก Environment Variables; finding ยังเปิดอยู่จนกว่าเจ้าของระบบจะ Rotate/Revoke credential และพิจารณาจัดการ Git history
- **ข้อเสนอ:** ให้เจ้าของระบบประเมินผลกระทบและหมุน/เพิกถอน key ผ่านขั้นตอนที่อนุมัติ พร้อมเตรียมอัปเดต Environment Variables ใน Hosting และผู้ใช้งานที่เกี่ยวข้อง จากนั้นย้ายสคริปต์ให้อ่านค่าจาก Environment Variables โดยไม่พิมพ์ค่าออกมา และวางแผนจัดการ Git history หลังหมุน key แล้ว
- **เจ้าของระบบต้องดำเนินการ:** อนุมัติและดำเนินการ Rotate/Revoke; ตรวจ Vercel และระบบที่ใช้ key นี้; ประเมิน forks, clones และสำเนาอื่นของ Repository
- **ข้อจำกัด:** ตรวจพบ role จาก credential ที่ฝังอยู่ แต่ไม่ได้ทดสอบว่า credential ยังใช้งานได้กับ Production และไม่ได้ตรวจ remote-only หรือ unreachable/pruned Git objects

### MEDIUM — Import API เคยบันทึก URL ที่อาจมีข้อมูลลับลง Application Log

- **ความเชื่อมั่น:** 8/10
- **หลักฐานก่อนแก้:** [`src/app/api/import/route.ts`](./src/app/api/import/route.ts:97), [`src/app/api/import/route.ts`](./src/app/api/import/route.ts:100) และ [`src/app/api/import/route.ts`](./src/app/api/import/route.ts:120) log URL เต็มหรือ Graph URL ที่ฝัง URL ต้นฉบับใน Base64
- **สถานะปัจจุบัน:** แก้ให้ log เฉพาะ origin ที่ได้จาก [`getLogSafeUrlOrigin`](./src/lib/import/urlLog.mjs:5) ใน [`route.ts`](./src/app/api/import/route.ts:92), [`route.ts`](./src/app/api/import/route.ts:99), [`route.ts`](./src/app/api/import/route.ts:102) และ [`route.ts`](./src/app/api/import/route.ts:122). Path, query string และ userinfo ไม่ถูกบันทึก
- **ผลกระทบ/สถานการณ์:** URL ที่เคยถูกบันทึกอาจยังอยู่ใน Hosting Logs และอาจมี OneDrive share token; การแก้ Source ไม่ลบ log เก่าหรือเพิกถอนลิงก์เดิม
- **ข้อเสนอที่ดำเนินการแล้ว:** บันทึกเฉพาะ URL origin เพื่อคงข้อมูลช่วยวิเคราะห์ปลายทาง โดยไม่บันทึก path/query ที่อาจมี token; URL ที่ไม่ถูกต้องได้ placeholder `[invalid URL]`
- **เจ้าของระบบต้องดำเนินการ:** ตรวจการเข้าถึงและ retention ของ Hosting Logs; หากพบ share URL ที่ยังใช้ได้ ให้เพิกถอนหรือเปลี่ยนสิทธิ์แชร์ตามความเหมาะสม

## การควบคุมที่ตรวจพบเบื้องต้น

รายการต่อไปนี้เป็นข้อสังเกตจากไฟล์ที่ตรวจ ไม่ใช่การยืนยันว่า Production ใช้ค่าเดียวกันหรือปลอดภัยครบถ้วน:

- Migration ที่ตรวจระบุการเปิด RLS บนตารางข้อมูลหลักและ `login_attempts`; พบ public read policies แบบระบุชัด และไม่พบ public write policies ใน migration ชุดที่ตรวจ: [`supabase/migration.sql`](./supabase/migration.sql:31), [`supabase/migration.sql`](./supabase/migration.sql:35), [`supabase/migration.sql`](./supabase/migration.sql:66), [`supabase/migration.sql`](./supabase/migration.sql:84).
- Proxy ตรวจ admin token สำหรับ Admin API และ write methods: [`src/proxy.ts`](./src/proxy.ts:47); อย่างไรก็ตาม History GET endpoint ไม่ต้องยืนยันตัวตน และ migration อนุญาต public read สำหรับ `players` และ `score_history`: [`supabase/migration.sql`](./supabase/migration.sql:35). ยังไม่ได้ยืนยันว่าการเปิดเผยประวัติเป็นไปตามเจตนาของเจ้าของระบบ
- Migration อนุญาต public read บน `imports` และ `import_logs`: [`supabase/migration.sql`](./supabase/migration.sql:70). ขอบเขตข้อมูลและความเหมาะสมของการเปิดเผย metadata ยังต้องยืนยัน
- Policy สำหรับ `app_settings` จำกัด public read ไว้ที่ `rank_thresholds`: [`supabase/migrations/20261018_app_settings.sql`](./supabase/migrations/20261018_app_settings.sql:12), [`supabase/migrations/20261022_fix_app_settings_rls.sql`](./supabase/migrations/20261022_fix_app_settings_rls.sql:9).
- RPC ที่ตรวจบางรายการ revoke execute จาก `PUBLIC`, `anon`, `authenticated` และ grant ให้ `service_role`: [`supabase/migrations/20261103213000_atomic_import_rollback.sql`](./supabase/migrations/20261103213000_atomic_import_rollback.sql:169), [`supabase/migrations/20261103214600_atomic_player_score_history.sql`](./supabase/migrations/20261103214600_atomic_player_score_history.sql:82), [`supabase/migrations/20261103230000_atomic_admin_login_attempts.sql`](./supabase/migrations/20261103230000_atomic_admin_login_attempts.sql:76).
- Admin login cookie ที่ตรวจตั้ง `HttpOnly`, `SameSite=Lax` และอายุหนึ่งชั่วโมง: [`src/app/api/admin/login/route.ts`](./src/app/api/admin/login/route.ts:143). ไม่พบ Origin/CSRF-token check ใน proxy; ยังยืนยันไม่ได้ว่า topology ของโดเมนที่ deploy ทำให้โจมตี CSRF ได้จริงหรือไม่
- Import handler log เฉพาะ URL origin หลังแก้ไข; ยังคง log raw rows บางส่วนจาก workbook ที่ [`src/app/api/import/route.ts`](./src/app/api/import/route.ts:185). ความอ่อนไหวของ raw rows ยังไม่ทราบและไม่ได้อยู่ในขอบเขตการแก้ครั้งนี้

## ตารางสรุปการตรวจ API และสิทธิ์ฐานข้อมูล

การตรวจครั้งนี้ยังไม่ได้รวบรวม API ทุก route/method หรือ policy/grant ทุกตาราง จึงไม่สามารถยืนยัน Authentication, Authorization หรือสิทธิ์จริงราย route/ตารางได้ครบถ้วน ห้ามใช้ตารางนี้แทนผลตรวจฉบับสมบูรณ์:

| พื้นที่ | หลักฐานที่ตรวจได้ | สถานะ |
|---|---|---|
| Admin API / write methods | Proxy ตรวจ admin token; ยังไม่มี route-by-route authorization matrix ในผลตรวจรอบนี้ | ตรวจได้บางส่วน; ต้องตรวจต่อ |
| History GET | ไม่ต้องยืนยันตัวตน; migrations อนุญาต public read บน `players` และ `score_history` | ยืนยันได้จาก source/migration; เจตนาการเปิดเผยต้องยืนยัน |
| Import API | URL logging เปลี่ยนเป็น origin-only; raw rows ยังถูก log; authorization ของทุก method/handler ยังไม่ได้ยืนยัน | Source fix แล้ว; ตรวจ Hosting Logs/authorization ต่อ |
| ตารางข้อมูลหลัก, `imports`, `import_logs` และ `login_attempts` | Migration ที่ตรวจเปิด RLS และมี public read policies บางรายการ; ยังไม่มี matrix ของ `SELECT/INSERT/UPDATE/DELETE` แยกทุก role และทุกตาราง | ตรวจได้บางส่วน |
| `app_settings` | Public read จำกัดที่ `rank_thresholds` ตาม migration ที่ตรวจ | ตรวจได้บางส่วน |
| RPC | พบ RPC บางรายการจำกัด execute ให้ `service_role`; ยังไม่ได้ inventory RPC ทั้งหมดและตรวจ `SECURITY DEFINER`, `search_path`, ownership และ grants ครบถ้วน | ตรวจได้บางส่วน |
| Supabase client / privileges ที่ deploy จริง | ไม่ได้ตรวจการตั้งค่าและ grants บน Production | ยืนยันไม่ได้ |

## รายการที่ยังไม่ยืนยัน / ขั้นตอนตรวจต่อ

- ทำ inventory ของ API routes และ methods ทั้งหมด พร้อมระบุการอ่าน/เขียน, Authentication, Authorization, resource-level checks, validation และ rate limiting
- ทำตารางสิทธิ์ `SELECT`, `INSERT`, `UPDATE`, `DELETE` แยกทุกตารางและ role จาก migrations ปัจจุบัน; ตรวจเทียบสถานะ deploy ด้วยวิธีที่ได้รับอนุมัติ โดยไม่แก้ Production
- ตรวจ RPC/functions ทั้งหมด โดยเฉพาะ `SECURITY DEFINER`, `search_path`, ownership, execute grants และการใช้ service-role client
- ตรวจ admin session lifecycle, expiry, revocation, logout, CSRF exposure และการบังคับใช้ proxy เทียบกับ handler จริง
- ตรวจ `.env*`, `.gitignore`, build output และ Git history เพิ่มตามขอบเขตที่ทำได้ โดยไม่แสดง secret values
- ตรวจว่า key ที่เปิดเผยถูก Rotate/Revoke แล้ว และยืนยันการทำงานของระบบจากเจ้าของระบบ โดยไม่ขอให้ส่ง Secret ในแชท

## การแก้ไขและการทดสอบ

- **แก้ไข Source แล้ว:** เพิ่ม `scratch/supabase-env.js` ให้ตรวจ `NEXT_PUBLIC_SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` แบบ fail-fast; อัปเดตสคริปต์ทั้ง 15 ไฟล์ให้อ่าน config ผ่าน helper โดยไม่เปลี่ยนการทำงานฐานข้อมูลของสคริปต์
- **ยังต้องให้เจ้าของระบบดำเนินการ:** Rotate/Revoke credential ที่เคยถูกเปิดเผย และพิจารณาจัดการ Git history; การแก้ Source ปัจจุบันไม่ได้ลบ credential ออกจาก commit เก่า
- **ยังต้องติดตาม:** ตรวจสอบ Hosting Logs ย้อนหลังสำหรับ URL ที่อาจมี share token; CRITICAL ยังเปิดอยู่จนกว่าจะจัดการ credential/history ตามข้างต้น
- **Migration:** ไม่มีการสร้างหรือรัน
- **Production:** ไม่มีการเชื่อมต่อหรือเปลี่ยนแปลง; ไม่ได้รัน utility scripts
- **Tests:** `node --test` ผ่าน 33/33; Supabase helper มี 4 tests และ URL logger มี 3 tests
- **Syntax:** `node --check` ผ่าน utility scripts ทั้ง 15 ไฟล์
- **TypeScript:** `npx tsc --noEmit` ผ่าน
- **Lint:** targeted ESLint จบโดยไม่มี errors; มี 4 warnings เดิมใน `route.ts` ที่ไม่เกี่ยวกับการแก้ logging
- **Static verification:** ตรวจ 15 ไฟล์แล้วไม่พบ JWT pattern, Supabase URL literal หรือไฟล์ที่ไม่ได้เรียก helper
