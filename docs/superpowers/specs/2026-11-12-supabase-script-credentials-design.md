# Move Supabase Script Credentials to Environment Variables

## Intent

Remove embedded Supabase service-role credentials from the 15 tracked utility scripts identified in `SECURITY_AUDIT.md`, while retaining their existing diagnostic and maintenance purposes. This reduces the risk of future credential exposure in source files; it does not revoke credentials already present in Git history.

## Goals and non-goals

- Replace embedded Supabase URL/key values with the repository's existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment-variable names.
- Fail explicitly before making a Supabase request if required configuration is missing.
- Keep each script's existing operation unchanged.
- Do not rotate credentials, rewrite Git history, access or modify Production, run any utility script, or perform database operations.
- Do not change the destructive `players` deletion in `query_db.js`; it remains an explicit owner-review item and must not be executed as part of this work.

## Approaches

1. **Use a shared configuration helper (selected):** centralize required-variable checks and use it from each affected script. This avoids inconsistent validation across scripts and adds no dependency.
2. **Read and validate environment variables in every script:** avoids a helper file but duplicates checks across 15 scripts, making future drift more likely.
3. **Remove the utility scripts:** eliminates their runtime capability but exceeds the selected scope and does not invalidate values already in Git history.

The shared helper is selected to preserve current utility behavior while making configuration consistent and failing closed when values are absent.

## Files and impact

- Add one helper under `scratch/` for the required Supabase URL/key lookup and validation.
- Update the 15 scripts listed under the HIGH finding in `SECURITY_AUDIT.md` to use that helper. The root-level `query_db.js` will import it using the appropriate relative path.
- No production application code, dependency manifests, migrations, or environment files will be changed.

## Verification

- Confirm no service-role credential literals remain in the 15 scripts or the new helper without printing secret values.
- Run a local, non-network check showing missing variables produce an explicit error and configured placeholder values are accepted by the helper.
- Do not run any affected script because scripts may access or mutate database data; specifically, `query_db.js` contains a `players` deletion.

## Remaining owner actions

The owner must separately rotate/revoke the exposed key, update Hosting/environment configuration as applicable, and decide whether to rewrite Git history. Those actions are not included here.
