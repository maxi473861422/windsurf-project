#!/bin/bash

# GSD Atlas Backup Script
# This script automates backups for PostgreSQL, Redis, and S3

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

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

# Create backup directory
mkdir -p "$BACKUP_DIR/postgresql"
mkdir -p "$BACKUP_DIR/redis"

echo "[$(date)] Starting backup process..."

# PostgreSQL Backup
echo "[$(date)] Backing up PostgreSQL..."
PGPASSWORD="$BACKUP_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom --compress=9 \
  "$BACKUP_DIR/postgresql/gsd_atlas_$TIMESTAMP.dump"

# Upload PostgreSQL backup to S3
echo "[$(date)] Uploading PostgreSQL backup to S3..."
aws s3 cp "$BACKUP_DIR/postgresql/gsd_atlas_$TIMESTAMP.dump" \
  "s3://$S3_BUCKET/postgresql/gsd_atlas_$TIMESTAMP.dump" \
  --region "$AWS_REGION"

# Redis Backup
echo "[$(date)] Backing up Redis..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
sleep 10

# Copy Redis RDB file
docker cp $(docker ps -q -f "name=redis"):/data/dump.rdb \
  "$BACKUP_DIR/redis/redis_$TIMESTAMP.rdb"

# Upload Redis backup to S3
echo "[$(date)] Uploading Redis backup to S3..."
aws s3 cp "$BACKUP_DIR/redis/redis_$TIMESTAMP.rdb" \
  "s3://$S3_BUCKET/redis/redis_$TIMESTAMP.rdb" \
  --region "$AWS_REGION"

# S3 Backup (user uploaded files)
echo "[$(date)] Backing up S3 user files..."
aws s3 sync "s3://gsd-atlas-uploads" \
  "s3://$S3_BUCKET/uploads/$TIMESTAMP/" \
  --region "$AWS_REGION"

# Clean up old backups (local)
echo "[$(date)] Cleaning up old local backups..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

# Clean up old backups (S3)
echo "[$(date)] Cleaning up old S3 backups..."
aws s3 ls "s3://$S3_BUCKET/postgresql/" --region "$AWS_REGION" | \
  while read -r line; do
    createDate=$(echo $line | awk '{print $1" "$2}')
    createDate=$(date -d "$createDate" +%s)
    olderThan=$(date -d "-$RETENTION_DAYS days" +%s)
    if [[ $createDate -lt $olderThan ]]; then
      fileName=$(echo $line | awk '{print $4}')
      if [ -n "$fileName" ]; then
        aws s3 rm "s3://$S3_BUCKET/postgresql/$fileName" --region "$AWS_REGION"
      fi
    fi
  done

echo "[$(date)] Backup process completed successfully!"

# Send notification (optional)
if [ -n "$SLACK_WEBHOOK" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"✅ GSD Atlas backup completed successfully at $(date)\"}" \
    "$SLACK_WEBHOOK"
fi
