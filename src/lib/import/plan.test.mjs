import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImportPlan } from './plan.mjs';

const VALID_DIVISIONS = ['กองทัพมหาเสือพิทักษ์', 'กองทัพธรณินพิทักษ์'];

function makePlayer(name, division, score) {
  return {
    id: `id-${name}`,
    player_name: name,
    division,
    total_score: score,
    position: '',
    starting_score: score,
    latest_change: 0,
  };
}

test('buildImportPlan reports new, update, and retire actions', () => {
  const existing = [
    makePlayer('Alice', 'กองทัพมหาเสือพิทักษ์', 100),
    makePlayer('Charlie', 'กองทัพมหาเสือพิทักษ์', 80),
  ];
  const parsed = [
    { player_name: 'Alice', division: 'กองทัพมหาเสือพิทักษ์', total_score: 150, position: '', source_row: 2, raw_score: 150 },
    { player_name: 'Bob', division: 'กองทัพมหาเสือพิทักษ์', total_score: 50, position: '', source_row: 3, raw_score: 50 },
  ];

  const plan = buildImportPlan(parsed, existing, VALID_DIVISIONS);

  assert.equal(plan.counts.new, 1);
  assert.equal(plan.counts.updated, 1);
  assert.equal(plan.counts.retired, 1);
  assert.equal(plan.errors.length, 0);

  const updateRow = plan.rows.find((r) => r.action === 'update');
  assert.ok(updateRow);
  assert.equal(updateRow.current_score, 100);
  assert.equal(updateRow.proposed_score, 150);

  const retireRow = plan.rows.find((r) => r.action === 'retire');
  assert.ok(retireRow);
  assert.equal(retireRow.player_name, 'Charlie');
});

test('buildImportPlan rejects invalid scores and divisions', () => {
  const parsed = [
    { player_name: 'Alice', division: 'กองทัพมหาเสือพิทักษ์', total_score: null, position: '', source_row: 2, raw_score: 'abc' },
    { player_name: 'Bob', division: 'กองทัพไม่มีจริง', total_score: 50, position: '', source_row: 3, raw_score: 50 },
  ];

  const plan = buildImportPlan(parsed, [], VALID_DIVISIONS);

  assert.equal(plan.counts.errors, 2);
  assert.equal(plan.rows.length, 2);
  assert.ok(plan.rows.every((r) => r.action === 'error'));
});

test('buildImportPlan rejects duplicate names in the source', () => {
  const parsed = [
    { player_name: 'Alice', division: 'กองทัพมหาเสือพิทักษ์', total_score: 100, position: '', source_row: 2, raw_score: 100 },
    { player_name: 'Alice', division: 'กองทัพมหาเสือพิทักษ์', total_score: 200, position: '', source_row: 3, raw_score: 200 },
  ];

  const plan = buildImportPlan(parsed, [], VALID_DIVISIONS);

  assert.ok(plan.errors.some((e) => e.reason.includes('ซ้ำ')));
});

test('buildImportPlan does not retire roster without valid players', () => {
  const existing = [makePlayer('Alice', 'กองทัพมหาเสือพิทักษ์', 100)];
  const parsed = [
    { player_name: 'Bob', division: 'กองทัพไม่มีจริง', total_score: 50, position: '', source_row: 2, raw_score: 50 },
  ];

  const plan = buildImportPlan(parsed, existing, VALID_DIVISIONS);

  assert.equal(plan.counts.retired, 0);
  assert.equal(plan.counts.errors, 1);
});
