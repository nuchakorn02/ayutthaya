/**
 * Client for the atomic import-session rollback RPC.
 */

export type RollbackRpcResult = { data: unknown; error: null } | { data: null; error: { code?: string; message: string } };

export type RollbackRpc = (
  fn: 'rollback_import_session',
  args: { p_import_id: string }
) => Promise<RollbackRpcResult>;

export class RollbackRpcError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'RollbackRpcError';
    this.code = code;
  }
}

export async function rollbackImport(rpc: RollbackRpc, importId: string): Promise<void> {
  const { error } = await rpc('rollback_import_session', { p_import_id: importId });

  if (error) {
    throw new RollbackRpcError(error.message, error.code);
  }
}
