# Infrastructure scripts

Plain shell and SQL scripts. They need only the PostgreSQL 17 client tools (`pg_dump`, `pg_restore`, `psql`) on `PATH`. No npm dependencies.

| Script | Purpose |
|---|---|
| [`backup.sh`](backup.sh) | Timestamped, compressed `pg_dump -Fc` backup. Verifies with `pg_restore --list`. Exits non-zero on any failure. |
| [`restore.sh`](restore.sh) | Restores a backup with `pg_restore --clean --if-exists`. Requires `--yes` or `FORCE=1`. Destructive. |
| [`purge-stale-data.sql`](purge-stale-data.sql) | Deletes data past the ADR-021 retention windows. Dry run by default (`-v purge_apply=1` to commit). Never run automatically. |

Connection for all scripts: `DATABASE_URL`, or the standard `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` variables.

Operator docs:

- [`docs/ops/backup-restore-runbook.md`](../../docs/ops/backup-restore-runbook.md): step-by-step backup, verify, restore drill, incident restore, and purge.
- [`docs/ops/alerting.md`](../../docs/ops/alerting.md): what to alert on (Pikafish worker, AI fallback path, API errors, Postgres).
