const assert = require('node:assert/strict');
const test = require('node:test');
const { repairBrokenHistories, runHistoryRepair } = require('./historyRepair');

function createQueryClient(results) {
  let resultIndex = 0;
  const calls = [];
  const client = {
    from(table) {
      const call = { table, operations: [] };
      calls.push(call);
      return {
        select(value) {
          call.operations.push(['select', value]);
          return this;
        },
        eq(...args) {
          call.operations.push(['eq', ...args]);
          return this;
        },
        gte(...args) {
          call.operations.push(['gte', ...args]);
          return this;
        },
        order(...args) {
          call.operations.push(['order', ...args]);
          return this;
        },
        limit(...args) {
          call.operations.push(['limit', ...args]);
          return this;
        },
        update(value) {
          call.operations.push(['update', value]);
          return this;
        },
        maybeSingle() {
          call.operations.push(['maybeSingle']);
          return Promise.resolve(results[resultIndex++]);
        },
        then(resolve, reject) {
          return Promise.resolve(results[resultIndex++]).then(resolve, reject);
        },
      };
    },
  };
  return { client, calls };
}

test('reports log lookup errors and does not claim repair completed', async () => {
  const { client } = createQueryClient([
    { data: [{ id: 'history-1', player_id: 'player-1', new_score: 20, players: { player_name: 'Player' } }], error: null },
    { data: null, error: { message: 'import_logs unavailable' } },
  ]);
  const messages = [];

  const outcome = await runHistoryRepair(client, {
    today: new Date('2026-11-03T00:00:00.000Z'),
    log: (message) => messages.push(message),
  });

  assert.equal(outcome.exitCode, 1);
  assert.equal(outcome.summary.failed, 1);
  assert.equal(outcome.summary.fixed, 0);
  assert.equal(messages.some((message) => message.startsWith('Done fixing database.')), false);
  assert.equal(messages.some((message) => message.includes('Repair incomplete')), true);
});

test('reports history and player update errors instead of counting the record as fixed', async () => {
  const { client } = createQueryClient([
    { data: [{ id: 'history-1', player_id: 'player-1', new_score: 20, players: { player_name: 'Player' } }], error: null },
    { data: { old_score: 10 }, error: null },
    { data: { id: 'history-1' }, error: null },
    { data: null, error: { message: 'player update failed' } },
  ]);

  const result = await repairBrokenHistories(client, {
    today: new Date('2026-11-03T00:00:00.000Z'),
    log: () => {},
  });

  assert.equal(result.failed, 1);
  assert.equal(result.fixed, 0);
});

test('throws when the initial broken-history query fails', async () => {
  const { client } = createQueryClient([
    { data: null, error: { message: 'score_history unavailable' } },
  ]);

  await assert.rejects(
    repairBrokenHistories(client, { today: new Date(), log: () => {} }),
    /score_history unavailable/
  );
});

test('does not count the record fixed when updating score history fails', async () => {
  const { client, calls } = createQueryClient([
    { data: [{ id: 'history-1', player_id: 'player-1', new_score: 20, players: { player_name: 'Player' } }], error: null },
    { data: { old_score: 10 }, error: null },
    { data: null, error: { message: 'history update failed' } },
  ]);

  const result = await repairBrokenHistories(client, {
    today: new Date('2026-11-03T00:00:00.000Z'),
    log: () => {},
  });

  assert.equal(result.failed, 1);
  assert.equal(result.fixed, 0);
  assert.equal(calls.some((call) => call.table === 'players'), false);
});

test('prints completion only after a fully successful repair', async () => {
  const { client } = createQueryClient([
    { data: [], error: null },
  ]);
  const messages = [];

  const outcome = await runHistoryRepair(client, {
    today: new Date('2026-11-03T00:00:00.000Z'),
    log: (message) => messages.push(message),
  });

  assert.equal(outcome.exitCode, 0);
  assert.equal(messages.some((message) => message.startsWith('Done fixing database.')), true);
});
