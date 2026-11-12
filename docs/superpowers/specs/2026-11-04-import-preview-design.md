# Import Preview and Confirmation Design

## Intent

Give administrators a reliable review step before an Excel/CSV or OneDrive import changes player data. The preview should make score changes, new players, validation problems, and automatic retirements visible so an admin can catch mistakes before confirming.

## Goals

- Support local `.csv`, `.xlsx`, `.xls` files and OneDrive/Excel Online URLs.
- Parse and compare imports on the server using the same rules as the eventual write.
- Show counts and row-level details for new players, updates, and players who would be retired because they are absent from the source.
- Require explicit confirmation before writing anything.
- Block the entire import when any source row has a validation error; do not write valid rows from a flawed file.
- Ensure confirmation uses the same source content and database comparison state that the admin reviewed; stale previews must require a new preview.
- Preserve existing import session logs, score history, rollback support, and partial-persistence error reporting.

## Non-goals

- Do not change the existing policy that players missing from a confirmed roster import are retired.
- Do not add a preview-history table or store uploaded files in the database.
- Do not make all persistence failures transactional as part of this feature; existing partial-persistence reporting remains.
- Do not change the public leaderboard, score calculation policy, or how rank thresholds are chosen.

## Anti-goals

- Never allow a preview request to create an import session or mutate players, score history, or import logs.
- Never silently coerce invalid or missing score cells into zero.
- Never commit only the valid subset when any validation error exists.
- Never confirm a source whose bytes or relevant database comparison state changed since preview.

## Approaches

1. **Stateless preview and re-submit (selected):** parse and compare the source without writes, then have the browser submit the same file or URL again on confirmation. The server verifies a source fingerprint and that the player comparison state is unchanged before applying the import. A database RPC migration will lock and compare the relevant state in the same transaction that applies the import, closing the race between a check and subsequent writes. This avoids persistent preview records and staged-file storage, at the cost of processing/uploading the source twice.
2. **Persist a staged preview:** save the parsed rows and comparison snapshot temporarily, then commit that exact stored data. This avoids a second OneDrive fetch but adds storage, expiry/cleanup, access-control, and schema concerns.
3. **Preview in the browser:** parse the spreadsheet client-side and send rows at confirmation. This duplicates server parsing rules and could show a preview that differs from what the API imports, so it is not recommended.

## Design

### User flow

1. The admin selects a local file or enters a OneDrive URL and requests a preview.
2. The server fetches/reads and parses the source, validates all player rows, and compares them with current player records without writing data.
3. The UI displays filename/source, counts, and a review table with player name, division, current score, proposed score, score difference, and action (new/update/retire/error). It also clearly lists the players who will be retired because they are missing from the source.
4. Any validation error blocks confirmation for the whole file and identifies the spreadsheet row and reason. The admin must choose another source or correct the file and preview it again.
5. If all rows are valid, the admin explicitly confirms. The browser re-submits the same file or URL and the preview's source/comparison fingerprints.
6. The server re-reads and re-parses the source. It rejects the confirmation and asks for a fresh preview if the source fingerprint or relevant player-state fingerprint differs. Otherwise it applies the import using the existing import/session/history/log behavior and displays the existing completion or partial-persistence result.

### Server behavior

- Separate source reading/parsing, validation/comparison, and persistence so preview mode cannot accidentally reach write operations.
- Both preview and confirmation use the same canonical parser and import-plan builder. Local-file parsing and OneDrive fetching must result in the same row schema.
- Compute a cryptographic digest of the fetched source bytes. Confirmation must match the digest returned by preview.
- Build a deterministic comparison snapshot from the records needed to calculate updates, transfers, and retirement candidates; confirmation must match it before writes begin. The builder should choose the narrowest sufficient fields and a deterministic serialization.
- Enforce the final state comparison and import writes in one database transaction: lock the relevant `players`, `score_history`, and rank-settings state, compare it with the freshly prepared snapshot, and reject stale state before applying changes. Restrict the RPC to `service_role`.
- Preserve per-operation persistence error collection and partial-import reporting inside the RPC; this feature does not turn all persistence failures into all-or-nothing imports.
- Strictly validate player name, division, finite non-negative score, duplicate/ambiguous player rows, and the existing retirement sentinel restrictions. Preserve row numbers and current division/banner parsing conventions.
- The preview response must include structured row-level actions and errors, aggregate counts, source fingerprint, comparison fingerprint, and a short-lived client confirmation context. It must not expose secrets or include raw URL query credentials in logs or responses.
- Use a conflict response when either fingerprint has changed. Do not silently regenerate a plan and apply it under the old confirmation.
- Preserve existing protection around empty/unparseable imports and never retire the roster when no valid import plan exists.
- Apply the existing “retire players absent from source” behavior only after successful validation and explicit confirmation.
- Authentication/authorization must remain consistent with the current admin import route and must be enforced for both preview and confirmation.

### UI behavior

- Replace direct “นำเข้าข้อมูล” behavior with “ตรวจสอบก่อนนำเข้า” followed by a separate “ยืนยันนำเข้า” action.
- Support both local files and OneDrive URLs through the same review/confirmation flow.
- Show meaningful loading and errors for preview fetch, stale source/comparison state, and final import.
- Allow canceling the preview or selecting a different source without writing data.
- Keep row details usable for large files (bounded/paginated display while retaining aggregate counts and all validation errors).
- Do not render a confirmation control when validation errors exist.

## Constraints and validation

- Follow the installed Next.js 16 Route Handler conventions and the existing Supabase service-role access pattern.
- Add tests for read-only preview behavior, exact score parsing, duplicate/invalid row blocking, retirement previews, source-fingerprint mismatch, database-state mismatch, and successful confirmation.
- Verify that both local and OneDrive paths share the same parse/plan behavior.
- Run the complete available test suite, lint, TypeScript validation, and production build. Live Supabase credentials are not assumed.

## Builder decisions

- The selected design is stateless re-submit with content and comparison fingerprint checks.
- Confirmation uses a database RPC to atomically compare the prepared state and perform import writes; it does not persist preview records or source files.
- Any validation error stops the entire import; no valid subset is committed.
- Continue retiring players omitted from a confirmed roster, but show exactly who and how many in the preview.
- All other implementation details, including API response types, fingerprint representation, and practical table pagination, are left to the builder.
