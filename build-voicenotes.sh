#!/bin/bash

set -e

# Configuration
REPO_PATH="./git/voicenotes"
CONTAINER_NAME="voicenotes"
IMAGE_NAME="voicenotes"

# Volume paths (adjust these for your server)
CONFIG_VOLUME="/mnt/user/appdata/voicenotes/config"

# Runtime environment variables
TZ="Europe/Berlin"
TRANSCRIPTION_TARGET="obsidian"           # obsidian, fabric, or tana
POLLING_INTERVAL_MS="30000"               # 30 seconds

# Google Drive settings
GOOGLE_SERVICE_ACCOUNT_FILE="/app/config/service-account-key.json"
GOOGLE_DRIVE_FOLDER_ID="your_drive_folder_id"
GOOGLE_DRIVE_PROCESSED_FOLDER_ID="your_processed_folder_id"

# Obsidian settings (only when TRANSCRIPTION_TARGET=obsidian)
OBSIDIAN_VAULT_VOLUME="/mnt/user/appdata/voicenotes/vault"
OBSIDIAN_VAULT_ROOT="/app/vault"

# Fabric settings (only when TRANSCRIPTION_TARGET=fabric)
FABRIC_API_KEY=""

# Tana settings (only when TRANSCRIPTION_TARGET=tana)
TANA_API_TOKEN=""
TANA_SUPERTAG_ID=""

RESTART_ONLY=false

if [ "${1-}" = "--restart-only" ] || [ "${1-}" = "-r" ]; then
  RESTART_ONLY=true
  echo "⏭️  Restart-only mode: skipping git pull and image rebuild."
fi

echo "🔄 Updating Voicenotes..."

cd "$REPO_PATH"

if [ "$RESTART_ONLY" = false ]; then
  echo "📥 Pulling latest changes from git..."
  git pull

  echo "🗑️  Removing old image..."
  docker rmi "$IMAGE_NAME" 2>/dev/null || true

  echo "🔨 Building new image..."
  docker build -t "$IMAGE_NAME" .
else
  echo "⏭️  Skipping git pull, image removal, and build."
fi

echo "🛑 Stopping and removing old container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "🚀 Starting new container..."

# Build volume arguments
VOLUME_ARGS="-v $CONFIG_VOLUME:/app/config:rw"
if [ "$TRANSCRIPTION_TARGET" = "obsidian" ]; then
  VOLUME_ARGS="$VOLUME_ARGS -v $OBSIDIAN_VAULT_VOLUME:/app/vault:rw"
fi

docker run -d \
  --name="$CONTAINER_NAME" \
  --restart unless-stopped \
  --net='bridge' \
  --pids-limit 2048 \
  -e TZ="$TZ" \
  -e HOST_CONTAINERNAME="$CONTAINER_NAME" \
  -e TRANSCRIPTION_TARGET="$TRANSCRIPTION_TARGET" \
  -e POLLING_INTERVAL_MS="$POLLING_INTERVAL_MS" \
  -e GOOGLE_SERVICE_ACCOUNT_FILE="$GOOGLE_SERVICE_ACCOUNT_FILE" \
  -e GOOGLE_DRIVE_FOLDER_ID="$GOOGLE_DRIVE_FOLDER_ID" \
  -e GOOGLE_DRIVE_PROCESSED_FOLDER_ID="$GOOGLE_DRIVE_PROCESSED_FOLDER_ID" \
  -e OBSIDIAN_VAULT_ROOT="$OBSIDIAN_VAULT_ROOT" \
  -e FABRIC_API_KEY="$FABRIC_API_KEY" \
  -e TANA_API_TOKEN="$TANA_API_TOKEN" \
  -e TANA_SUPERTAG_ID="$TANA_SUPERTAG_ID" \
  -l net.unraid.docker.managed=dockerman \
  $VOLUME_ARGS \
  "$IMAGE_NAME"

echo "✅ Done! Container is running."
echo "📋 Container logs: docker logs -f $CONTAINER_NAME"
