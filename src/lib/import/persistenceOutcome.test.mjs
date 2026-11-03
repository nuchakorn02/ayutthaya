import assert from 'node:assert/strict';
import test from 'node:test';
import { getImportPersistenceOutcome } from './persistenceOutcome.mjs';

test('reports persistence failures as partial imports, not successful imports', () => {
  assert.deepEqual(
    getImportPersistenceOutcome(['Failed to save import logs']),
    {
      status: 500,
      partial: true,
      message: 'Import was only partially applied. Review the import session before retrying.',
    }
  );
});

test('does not mark an import partial when persistence succeeded', () => {
  assert.deepEqual(getImportPersistenceOutcome([]), {
    status: 200,
    partial: false,
    message: null,
  });
});
