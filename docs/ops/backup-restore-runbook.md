# Backup & Restore Runbook

Scripts: `infrastructure/scripts/backup.sh`, `infrastructure/scripts/restore.sh`.
Toolchain: PostgreSQL 17 client (`pg_dump`, `pg_restore`, `psql`). Dev server is `postgres:17-alpine` (`infrastructure/docker/docker-compose.dev.yml`, container `xq_postgres_dev`).

## Connection

Set ONE of these before running any script (standard libpq variables):

```bash
export DATABASE_URL='postgresql://xq:<password>@<host>:5432/xq_dev'
# Prisma-style ?schema=public is accepted; the scripts strip it.
```
or
```bash
export PGHOST=<host> PGPORT=5432 PGUSER=xq PGPASSWORD='<password>' PGDATABASE=xq_dev
```

Never paste the password into a shared log or ticket.

## A. Take a backup

1. Confirm the target is the database you think it is:
   ```bash
   psql "$DATABASE_URL" -tAc 'select current_database(), inet_server_addr()'
   ```
2. Run the backup (default output `./backups`, or pass a directory):
   ```bash
   infrastructure/scripts/backup.sh /secure/backups
   ```
3. Success prints `ok: <path> (<bytes> bytes)` and the path on stdout. Non-zero exit = failure; no partial file is left under the final name.
4. Record the path. Backups are named `xq-<UTC timestamp>.dump`.

## B. Verify a backup (no restore)

```bash
pg_restore --list /secure/backups/xq-<timestamp>.dump > /dev/null && echo VALID
pg_restore --list /secure/backups/xq-<timestamp>.dump | grep -c 'TABLE DATA'   # should be ~ number of tables (>= 10)
```

`backup.sh` already runs `pg_restore --list` before it reports success, so this is a second check. Run it on any copy you move off-host.

## C. Restore drill (throwaway database, NEVER production)

Run quarterly, and after any change to `schema.prisma` or the backup scripts.

1. Create a throwaway database on a non-production server:
   ```bash
   createdb -h <drill-host> -U xq xq_drill
   ```
2. Point the environment at the drill database:
   ```bash
   export DATABASE_URL='postgresql://xq:<password>@<drill-host>:5432/xq_drill'
   ```
3. Restore. Interactive: pass `--yes`. Non-interactive (CI / scheduled drill): set `FORCE=1`.
   ```bash
   infrastructure/scripts/restore.sh --yes /secure/backups/xq-<timestamp>.dump
   # or, unattended:
   FORCE=1 infrastructure/scripts/restore.sh /secure/backups/xq-<timestamp>.dump
   ```
4. Sanity-check row counts against the source (they should match for a backup taken just before):
   ```bash
   psql "$DATABASE_URL" -tAc 'select (select count(*) from "User"), (select count(*) from "Game"), (select count(*) from "Lesson"), (select count(*) from "Puzzle")'
   ```
5. Drop the drill database:
   ```bash
   dropdb -h <drill-host> -U xq xq_drill
   ```
6. Record the drill date, backup file, and result.

`restore.sh` refuses to run without `--yes` or `FORCE=1`. It runs `--clean --if-exists`, which drops and recreates every object in the dump inside the target database. It does NOT create the target database.

## D. Real restore (incident)

Only after the incident lead approves the target and the backup file.

1. Take a fresh backup of the current (damaged) state first, even if partial: `backup.sh`.
2. Stop writers (API / pikafish-worker) so no new rows land during restore.
3. Export `DATABASE_URL` for the target, then:
   ```bash
   infrastructure/scripts/restore.sh --yes /secure/backups/xq-<timestamp>.dump
   ```
4. If `restore.sh` reports failure, the target may be half-restored. Do NOT restart writers on it. Re-run the restore from step 3, or escalate.
5. Run the row-count check from C.4 and an API smoke test before restarting writers.

## E. Purge old data (not automatic)

See `infrastructure/scripts/purge-stale-data.sql` and the retention policy in `docs/adr/ADR-021-data-retention.md` (status: Proposed).

1. Take a backup first (step A).
2. Dry run (default: prints planned counts, then rolls back):
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infrastructure/scripts/purge-stale-data.sql
   ```
3. Review counts. If correct, commit:
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v purge_apply=1 -f infrastructure/scripts/purge-stale-data.sql
   ```
4. Retention windows can be overridden per run with `-v guest_retention_days=90 -v finished_game_retention_days=180 -v unstarted_game_retention_days=7`.

## Cadence

| Task | Frequency |
|---|---|
| Backup (`backup.sh`) | Daily, scheduled; keep at least 14 days (see gaps below) |
| Verify latest backup (B) | Weekly |
| Restore drill (C) | Quarterly, and after schema changes |
| Purge (E) | Only once ADR-021 is approved; then monthly, after a backup |

## Known gaps

- ADR-021 (retention windows) is **Proposed**, not approved. Purge defaults follow it; the 7-day unstarted-game window is an operator judgment, not policy.
- Backup retention / off-host storage location is not defined yet. Pick one before relying on this in production.
- Server logs (14-day policy in ADR-021) are not in Postgres and are not covered by these scripts.
- Scripts are tested against the dev instance (`postgres:17-alpine`). Re-run drill C after the prod Postgres (T7.2) ships.
