#!/bin/bash

# GSD Atlas Restore Script
# This script restores backups from S3 for PostgreSQL and Redis

set -e

# Configuration
BACKUP_DIR="/tmp/restore"
TIMESTAMP=$1

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-gsd_atlas}"
DB_USER="${DB_USER:-postgres}"
BACKUP_PASSWORD="${BACKUP_PASSWORD:-}"

# Redis configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# S3 configuration
S3_BUCKET="${S3_BUCKET:-gsd-atlas-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [ -z "$TIMESTAMP" ]; then
  echo "Usage: $0 <timestamp>"
  echo "Example: $0 20240101_120000"
  exit 1
fi

# Create restore directory
mkdir -p "$BACKUP_DIR/postgresql"
mkdir -p "$BACKUP_DIR/redis"

echo "[$(date)] Starting restore process for backup: $TIMESTAMP"

# Restore PostgreSQL
echo "[$(date)] Downloading PostgreSQL backup from S3..."
aws s3 cp "s3://$S3_BUCKET/postgresql/gsd_atlas_$TIMESTAMP.dump" \
  "$BACKUP_DIR/postgresql/gsd_atlas_$TIMESTAMP.dump" \
  --region "$AWS_REGION"

echo "[$(date)] Restoring PostgreSQL..."
PGPASSWORD="$BACKUP_PASSWORD" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  -d "$DB_NAME" --clean --if-exists \
  "$BACKUP_DIR/postgresql/gsd_atlas_$TIMESTAMP.dump"

# Restore Redis
echo "[$(date)] Downloading Redis backup from S3..."
aws s3 cp "s3://$S3_BUCKET/redis/redis_$TIMESTAMP.rdb" \
  "$BACKUP_DIR/redis/redis_$TIMESTAMP.rdb" \
  --region "$AWS_REGION"

echo "[$(date)] Stopping Redis..."
docker stop redis || true

echo "[$(date)] Copying Redis RDB file..."
docker cp "$BACKUP_DIR/redis/redis_$TIMESTAMP.rdb" \
  $(docker create redis):/data/dump.rdb

echo "[$(date)] Starting Redis..."
docker start redis

# Clean up
echo "[$(date)] Cleaning up temporary files..."
rm -rf "$BACKUP_DIR"

echo "[$(date)] Restore process completed successfully!"

# Send notification (optional)
if [ -n "$SLACK_WEBHOOK" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🔄 GSD Atlas restore completed successfully at $(date)\"}" \
    "$SLACK_WEBHOOK"
fi
