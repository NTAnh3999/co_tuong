#!/usr/bin/env bash
# restore.sh - restore a pg_dump custom-format backup (from backup.sh) into a target database.
#
# DESTRUCTIVE: --clean --if-exists drops and recreates every object contained in the dump
# inside the target database. Never run a drill against production.
#
# Usage:
#   infrastructure/scripts/restore.sh [--yes] BACKUP_FILE
#
# Confirmation: refuses to run unless --yes is passed OR FORCE=1 is set in the environment.
#   FORCE=1 is for non-interactive drills (CI / scheduled job) only.
#
# Connection: same env vars as backup.sh (DATABASE_URL, or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE).
# The target database must already exist.
#
# Requires the PostgreSQL 17 client tools (pg_restore) on PATH.
set -euo pipefail

log() { printf 'restore.sh: %s\n' "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }
usage() {
  cat >&2 <<'EOF'
Usage: restore.sh [--yes] BACKUP_FILE
  --yes         confirm the destructive restore (or set FORCE=1)
Connection: DATABASE_URL, or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE.
EOF
}

confirmed=0
[[ "${FORCE:-}" == "1" ]] && confirmed=1
backup_file=""

for arg in "$@"; do
  case "$arg" in
    --yes) confirmed=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) usage; die "unknown option: $arg" ;;
    *)
      [[ -z "$backup_file" ]] || die "only one BACKUP_FILE may be given"
      backup_file="$arg"
      ;;
  esac
done

[[ -n "$backup_file" ]] || { usage; exit 2; }
command -v pg_restore >/dev/null 2>&1 || die "pg_restore not found on PATH (install the PostgreSQL 17 client tools)"
[[ -f "$backup_file" && -r "$backup_file" ]] || die "backup file not found or unreadable: $backup_file"
[[ -s "$backup_file" ]] || die "backup file is empty: $backup_file"

if [[ "$confirmed" -ne 1 ]]; then
  die "refusing to restore without --yes (or FORCE=1). This DROPS and recreates objects in the target database."
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  # Prisma-style URLs carry ?schema=..., which libpq rejects as an unknown parameter; drop that parameter.
  target="$(printf '%s' "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]*(&|$)/\1/; s/[?&]$//')"
  label="DATABASE_URL"
else
  [[ -n "${PGDATABASE:-}" ]] || die "set DATABASE_URL, or PGDATABASE (with PGHOST/PGUSER/PGPASSWORD as needed)"
  target="$PGDATABASE"
  label="${PGHOST:-localhost}/${PGDATABASE}"
fi

# Verify the archive is readable before touching the target.
pg_restore --list "$backup_file" >/dev/null || die "not a valid pg_dump custom-format archive: $backup_file"

log "restoring $backup_file into target $label (--clean --if-exists)"
if ! pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error --dbname="$target" "$backup_file"; then
  die "pg_restore failed; the target database may be partially restored - do not treat it as good"
fi

log "ok: restore complete into $label"
