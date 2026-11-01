#!/usr/bin/env bash
# Saves a compressed PostgreSQL backup to ./backups. Needs pg_dump and DATABASE_URL.
# Schedule it daily and copy the files off the server; test restoring one with pg_restore.
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL}"
mkdir -p backups
file="backups/vdp-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --dbname="${DATABASE_URL%%\?*}" --file="$file"
echo "Saved $file"
