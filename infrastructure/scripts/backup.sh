#!/usr/bin/env bash
# backup.sh - take a timestamped, compressed custom-format (pg_dump -Fc) backup of the xq Postgres database.
#
# Usage:
#   infrastructure/scripts/backup.sh [OUTPUT_DIR]
#
# Connection (standard libpq / pg_dump env vars, no custom names):
#   DATABASE_URL=postgresql://user:pass@host:5432/db   (preferred; a Prisma-style ?schema=... is stripped)
#   or PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
#
# Output directory: first argument, else $BACKUP_DIR, else ./backups
#
# Exits non-zero with a message on stderr on ANY failure, so it is safe to run unattended from cron/CI.
# A partial dump never ends up under its final file name.
#
# Requires the PostgreSQL 17 client tools (pg_dump, pg_restore) on PATH.
set -euo pipefail

log() { printf 'backup.sh: %s\n' "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

command -v pg_dump >/dev/null 2>&1 || die "pg_dump not found on PATH (install the PostgreSQL 17 client tools)"
command -v pg_restore >/dev/null 2>&1 || die "pg_restore not found on PATH (needed to verify the dump)"

if [[ -n "${DATABASE_URL:-}" ]]; then
  # Prisma-style URLs carry ?schema=..., which libpq rejects as an unknown parameter; drop that parameter.
  target="$(printf '%s' "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]*(&|$)/\1/; s/[?&]$//')"
else
  [[ -n "${PGDATABASE:-}" ]] || die "set DATABASE_URL, or PGDATABASE (with PGHOST/PGUSER/PGPASSWORD as needed)"
  target="$PGDATABASE"
fi

out_dir="${1:-${BACKUP_DIR:-./backups}}"
mkdir -p -- "$out_dir" || die "cannot create output directory: $out_dir"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="$out_dir/xq-$stamp.dump"
partial="$final.partial"

[[ ! -e "$final" ]] || die "refusing to overwrite existing file: $final"
trap 'rm -f -- "$partial"' EXIT

log "dumping database to $final"
if ! pg_dump --format=custom --compress=6 --no-owner --no-acl --file="$partial" --dbname="$target"; then
  die "pg_dump failed (see messages above)"
fi

[[ -s "$partial" ]] || die "dump file is empty: $partial"

# Verify the archive is readable by pg_restore without restoring anything.
if ! pg_restore --list "$partial" >/dev/null; then
  die "dump failed pg_restore --list verification: $partial"
fi

mv -- "$partial" "$final"
log "ok: $final ($(wc -c < "$final" | tr -d ' ') bytes)"
printf '%s\n' "$final"
