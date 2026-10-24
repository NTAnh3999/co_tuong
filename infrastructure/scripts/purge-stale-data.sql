-- purge-stale-data.sql
--
-- Deletes data past the retention windows described in docs/adr/ADR-021-data-retention.md
-- (status: Proposed - not yet approved; see docs/ops/backup-restore-runbook.md).
--
-- NOT run automatically. Operator runs it by hand, after taking a fresh backup (backup.sh).
--
--   Dry run (DEFAULT, nothing is deleted - prints planned counts, then ROLLBACK):
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infrastructure/scripts/purge-stale-data.sql
--
--   Apply (COMMIT):
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v purge_apply=1 -f infrastructure/scripts/purge-stale-data.sql
--
-- Retention windows are psql variables with the defaults below. Edit the defaults here, or override
-- per run with -v guest_retention_days=... etc. Requires psql 10+ (uses \if).
--
-- Tables NOT touched: "Lesson", "Puzzle" (content), "LearningProgress" of registered users,
-- registered "User" rows, and any Game/Room not matched below.

\set ON_ERROR_STOP on

-- ===== Retention windows (days) =====
-- Note: psql's \set keeps everything after the value, so comments go on their own lines.
-- guest_retention_days: ADR-021, guest sessions with expiresAt < now - 90 days.
\if :{?guest_retention_days}
\else
\set guest_retention_days 90
\endif
-- finished_game_retention_days: ADR-021, FINISHED games with finishedAt < now - 180 days.
\if :{?finished_game_retention_days}
\else
\set finished_game_retention_days 180
\endif
-- unstarted_game_retention_days: NOT in ADR-021. WAITING games never started. Operator judgment; adjust freely.
\if :{?unstarted_game_retention_days}
\else
\set unstarted_game_retention_days 7
\endif
-- purge_apply: 0 = dry run (ROLLBACK, default). 1 = apply (COMMIT).
\if :{?purge_apply}
\else
\set purge_apply 0
\endif

BEGIN;

-- Guest users whose guest session has expired. Restricted to type = 'GUEST' so registered accounts are never selected.
CREATE TEMP TABLE purge_guest_users ON COMMIT DROP AS
SELECT u.id
FROM "User" u
JOIN "GuestSession" gs ON gs."userId" = u.id
WHERE u.type = 'GUEST'
  AND gs."expiresAt" < now() - make_interval(days => :guest_retention_days);

-- Games to delete:
--   (a) any game a purged guest took part in (ADR-021: guest deletion includes all linked games)
--   (b) FINISHED games past the history window
--   (c) WAITING games (never started) past the unstarted window
CREATE TEMP TABLE purge_game_ids ON COMMIT DROP AS
SELECT g.id
FROM "Game" g
WHERE g."redId" IN (SELECT id FROM purge_guest_users)
   OR g."blackId" IN (SELECT id FROM purge_guest_users)
   OR (g.status = 'FINISHED' AND g."finishedAt" < now() - make_interval(days => :finished_game_retention_days))
   OR (g.status = 'WAITING' AND g."createdAt" < now() - make_interval(days => :unstarted_game_retention_days));

-- ===== Planned counts (shown in both dry run and apply) =====
\echo '--- planned deletions ---'
SELECT
  (SELECT count(*) FROM purge_guest_users)                                                     AS guest_users,
  (SELECT count(*) FROM "GuestSession" WHERE "userId" IN (SELECT id FROM purge_guest_users))   AS guest_sessions,
  (SELECT count(*) FROM "LearningProgress" WHERE "userId" IN (SELECT id FROM purge_guest_users)) AS learning_progress,
  (SELECT count(*) FROM "Room" WHERE "hostId" IN (SELECT id FROM purge_guest_users))           AS rooms_hosted_by_guests,
  (SELECT count(*) FROM "RoomMember" WHERE "userId" IN (SELECT id FROM purge_guest_users))     AS room_members_of_guests,
  (SELECT count(*) FROM purge_game_ids)                                                        AS games,
  (SELECT count(*) FROM "GameMove" WHERE "gameId" IN (SELECT id FROM purge_game_ids))          AS game_moves,
  (SELECT count(*) FROM "GameSnapshot" WHERE "gameId" IN (SELECT id FROM purge_game_ids))      AS game_snapshots;

-- ===== Deletions (child rows first; FKs on these tables are ON DELETE RESTRICT) =====

-- 1. Game children
DELETE FROM "GameMove"     WHERE "gameId" IN (SELECT id FROM purge_game_ids);
DELETE FROM "GameSnapshot" WHERE "gameId" IN (SELECT id FROM purge_game_ids);

-- 2. Detach rooms from games about to be deleted (FK is ON DELETE SET NULL; explicit for clarity)
UPDATE "Room" SET "gameId" = NULL WHERE "gameId" IN (SELECT id FROM purge_game_ids);

-- 3. Games
DELETE FROM "Game" WHERE id IN (SELECT id FROM purge_game_ids);

-- 4. Rooms and memberships owned by / involving purged guests
DELETE FROM "RoomMember" WHERE "roomId" IN (SELECT id FROM "Room" WHERE "hostId" IN (SELECT id FROM purge_guest_users));
DELETE FROM "RoomMember" WHERE "userId" IN (SELECT id FROM purge_guest_users);
DELETE FROM "Room"       WHERE "hostId" IN (SELECT id FROM purge_guest_users);

-- 5. Guest-owned progress and sessions
DELETE FROM "LearningProgress" WHERE "userId" IN (SELECT id FROM purge_guest_users);
DELETE FROM "GuestSession"     WHERE "userId" IN (SELECT id FROM purge_guest_users);

-- 6. Guest users themselves (type guard repeated on purpose)
DELETE FROM "User" WHERE id IN (SELECT id FROM purge_guest_users) AND type = 'GUEST';

\if :purge_apply
COMMIT;
\echo 'PURGE COMMITTED.'
\else
ROLLBACK;
\echo 'DRY RUN: rolled back, nothing deleted. Re-run with -v purge_apply=1 to commit.'
\endif
