import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDefaultPosition, getDisplayPosition } from './positionUtils';

describe('calculateDefaultPosition', () => {
  it('returns special-division titles regardless of score', () => {
    assert.equal(calculateDefaultPosition(0, 'กองทัพมหาเสือพิทักษ์'), 'ทหารเสือประจำพระองค์');
    assert.equal(calculateDefaultPosition(1000, 'กองทัพธรณินพิทักษ์'), 'ทหารธรณินพิทักษ์');
    assert.equal(calculateDefaultPosition(50, 'กองทัพอาทมาต'), 'หมื่นอาทมาต');
    assert.equal(calculateDefaultPosition(999, 'คณะผู้บริหาร'), 'คณะผู้บริหารส่วนกลาง');
  });

  it('returns guard fallback titles for guard divisions', () => {
    assert.equal(calculateDefaultPosition(0, 'กองทัพที่ 1 ปัญจะซันยะ'), 'พลอาสาสมัครทหารยาม | Junior Guardsmen');
    assert.equal(calculateDefaultPosition(20, 'กองทัพที่ 1 ปัญจะซันยะ'), 'พลทหารยาม | Guardsmen');
    assert.equal(calculateDefaultPosition(45, 'กองทัพที่ 1 ปัญจะซันยะ'), 'พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen');
    assert.equal(calculateDefaultPosition(60, 'กองทัพที่ 1 ปัญจะซันยะ'), 'พลทหารยามอาวุโส | Senior Guardsmen');
    assert.equal(calculateDefaultPosition(110, 'กองทัพที่ 1 ปัญจะซันยะ'), 'นายหมู่เวร | Squad Head Guardsmen');
    assert.equal(calculateDefaultPosition(210, 'กองทัพที่ 1 ปัญจะซันยะ'), 'นายหมวดเวร | Platoon Head Guardsmen');
    assert.equal(calculateDefaultPosition(315, 'กองทัพที่ 1 ปัญจะซันยะ'), 'นายกองเวร | Company Head Guardsmen');
    assert.equal(calculateDefaultPosition(600, 'กองทัพที่ 1 ปัญจะซันยะ'), 'นายพันเวร | Battalion Commander of Guardsmen');
  });

  it('returns police fallback titles for the police division', () => {
    assert.equal(calculateDefaultPosition(0, 'กองพระตำรวจหลวง'), 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)');
    assert.equal(calculateDefaultPosition(20, 'กองพระตำรวจหลวง'), 'พลประจำการตำรวจหลวง | Active Royal Police Trooper');
    assert.equal(calculateDefaultPosition(45, 'กองพระตำรวจหลวง'), 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper');
    assert.equal(calculateDefaultPosition(60, 'กองพระตำรวจหลวง'), 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper');
    assert.equal(calculateDefaultPosition(110, 'กองพระตำรวจหลวง'), 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader');
    assert.equal(calculateDefaultPosition(210, 'กองพระตำรวจหลวง'), 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer');
    assert.equal(calculateDefaultPosition(315, 'กองพระตำรวจหลวง'), 'นายกองตำรวจหลวง | Royal Police Battalion Commander');
    assert.equal(calculateDefaultPosition(600, 'กองพระตำรวจหลวง'), 'พันตำรวจหลวง | Royal Police Colonel');
  });

  it('prefers dynamic thresholds over fallback defaults', () => {
    const thresholds = [
      { score: 100, guardTitle: 'Sergeant', policeTitle: 'Inspector' },
      { score: 0, guardTitle: 'Recruit', policeTitle: 'Cadet' },
    ];
    assert.equal(calculateDefaultPosition(50, 'กองทัพที่ 1 ปัญจะซันยะ', thresholds), 'Recruit');
    assert.equal(calculateDefaultPosition(150, 'กองพระตำรวจหลวง', thresholds), 'Inspector');
  });
});

describe('getDisplayPosition', () => {
  it('keeps special leader/instructor positions intact', () => {
    assert.equal(getDisplayPosition('ครูฝึกทหารราชองครักษ์', 100, 'กองพระตำรวจหลวง'), 'ครูฝึกตำรวจหลวง สายทอง | Royal Police Instructor (Golden Line)');
    assert.equal(getDisplayPosition('ปลัดราชวัลลภสูงสุด', 0, 'กองทัพที่ 1 ปัญจะซันยะ'), 'ปลัดราชวัลลภสูงสุด');
  });
});
