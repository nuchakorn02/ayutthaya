import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rollbackImport, RollbackRpcError, type RollbackRpc } from './rollbackRpc.ts';

describe('rollbackImport', () => {
  it('calls the RPC exactly once with the requested import id', async () => {
    const calls: { fn: string; args: Record<string, unknown> }[] = [];
    const rpc: RollbackRpc = async (fn, args) => {
      calls.push({ fn, args: args as Record<string, unknown> });
      return { data: null, error: null };
    };

    await rollbackImport(rpc, 'import-123');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].fn, 'rollback_import_session');
    assert.equal(calls[0].args.p_import_id, 'import-123');
  });

  it('throws RollbackRpcError preserving the SQLSTATE and message', async () => {
    const rpc: RollbackRpc = async () => ({
      data: null,
      error: { code: 'PZ001', message: 'Snapshot missing for import log' },
    });

    await assert.rejects(
      () => rollbackImport(rpc, 'import-123'),
      (err: unknown) => {
        assert.ok(err instanceof RollbackRpcError);
        assert.equal((err as RollbackRpcError).code, 'PZ001');
        assert.equal((err as RollbackRpcError).message, 'Snapshot missing for import log');
        return true;
      }
    );
  });

  it('throws RollbackRpcError for generic RPC failures', async () => {
    const rpc: RollbackRpc = async () => ({
      data: null,
      error: { message: 'connection lost' },
    });

    await assert.rejects(
      () => rollbackImport(rpc, 'import-123'),
      (err: unknown) => {
        assert.ok(err instanceof RollbackRpcError);
        assert.equal((err as RollbackRpcError).code, undefined);
        assert.equal((err as RollbackRpcError).message, 'connection lost');
        return true;
      }
    );
  });
});
