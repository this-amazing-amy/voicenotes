# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio transcription service that polls Google Drive for audio files, transcribes them using Whisper AI, and sends transcriptions to your preferred target: Obsidian daily notes, Fabric notepads, or Tana inbox. Designed to run as a long-running service, either locally or in Docker.

## Development Commands

### Building & Running

- `npm run build` - Compile TypeScript to `dist/`
- `npm run dev` - Clean build and run (removes dist, compiles, executes)
- `npm start` - Run compiled code from `dist/main.js`
- `npm run bundle` - Create production bundle in `out/main.js` using esbuild

### Testing

- `npm test` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:run` - Run tests once (no watch)

## Architecture

### Main Flow (src/main.ts)

Entry point that initializes Whisper model and starts Google Drive polling. Includes retry logic (3 retries with 5s delay) for crash recovery. Sends PM2 "ready" signal after Whisper initialization to indicate the process is ready to handle requests.

### Google Drive Integration (src/drive.ts)

- `startWatchingDrive()`: Main polling loop with semaphore to prevent overlapping cycles
- `checkForNewFiles()`: Queries Drive for audio files in monitored folder
- `downloadAndProcessFile()`: Downloads file to temp directory, extracts timestamp from filename, processes, then moves to processed folder
- Files are sorted by name (not creation time) before processing to ensure timestamp order
- Service account authentication via JSON key file

### Audio Processing (src/audio.ts, src/transcription.ts)

- `convertToWav()`: Uses ffmpeg to convert audio to 16kHz WAV format
- `processAudioData()`: Converts WAV to Float32Array, merges stereo to mono
- `transcribeAudio()`: Splits audio into 30-second chunks, processes with Whisper medium model

### Obsidian Integration (src/obsidian.ts)

- `appendToObsidianDailyNote()`: Writes transcription to daily note in German date format
- Path structure: `01 - Journal/YYYY/MM - MonthName/DD. MonthName YYYY.md`
- Creates note from template if it doesn't exist: `09 - Templates/Daily Note.md`
- Format: `- [ ] HH:MM 🗣️ transcription text`

### Fabric Integration (src/fabric.ts)

- `createNotepadInFabric()`: Creates a new notepad in Fabric inbox
- Extracts title from first sentence of transcription
- Format: Title extracted from transcription, body contains `HH:MM 🗣️ transcription text`

### Tana Integration (src/tana.ts)

- `createNodeInTana()`: Creates a new node in Tana inbox via Input API
- Endpoint: `https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2`
- Target: INBOX (Tana's default capture location)
- Optional supertag support: Apply a supertag to categorize transcriptions
- Node name: transcription text (Tana automatically tracks creation timestamp)
- API rate limit: 1 call per second per token

### Filename Parsing (src/parseFilename.ts)

Extracts timestamps from audio filenames to determine which daily note to append to. Multiple formats supported.

### Configuration (src/config.ts)

Uses Zod for environment validation. Config loaded from `config/.env` (Docker) or `.env` (local).

Required environment variables:

- `TRANSCRIPTION_TARGET`: Target system for transcriptions (`obsidian`, `fabric`, or `tana`)
- `POLLING_INTERVAL_MS`: How often to check Drive (default: 30000)
- `GOOGLE_SERVICE_ACCOUNT_FILE`: Path to service account JSON key
- `GOOGLE_DRIVE_FOLDER_ID`: Folder to monitor for new audio files
- `GOOGLE_DRIVE_PROCESSED_FOLDER_ID`: Folder to move processed files

**Obsidian-specific variables** (required when `TRANSCRIPTION_TARGET=obsidian`):

- `OBSIDIAN_VAULT_ROOT`: Path to Obsidian vault

**Fabric-specific variables** (required when `TRANSCRIPTION_TARGET=fabric`):

- `FABRIC_API_KEY`: API key for Fabric

**Tana-specific variables** (required when `TRANSCRIPTION_TARGET=tana`):

- `TANA_API_TOKEN`: API token for Tana Input API
  - Get token: In Tana, go to Settings > API Tokens > Create token for your workspace
- `TANA_SUPERTAG_ID`: (Optional) NodeID of supertag to apply to transcriptions
  - Get supertag ID: In Tana, open supertag config panel, run command "Show API schema" on the supertag title

## Docker Deployment

The application is containerized and designed to run as a service. Use `build-voicenotes.sh` to build and deploy on your server:

- Copy `build-voicenotes.sh` to your server and adjust the configuration variables at the top
- The script pulls latest changes, builds the Docker image locally, and runs the container
- Use `./build-voicenotes.sh -r` to restart only (skip git pull and rebuild)

**Docker configuration:**

- Base image: `node:20-slim` with ffmpeg
- Build steps: npm install → TypeScript compile → esbuild bundle → prune dev deps
- Entrypoint: `pm2-runtime start ecosystem.config.js` (PM2 manages the process)
- Volumes: `/app/config` for `service-account-key.json`, `/app/vault` for Obsidian vault
- All environment variables are passed at runtime (no build-time variables needed)

## PM2 Process Supervisor

The application uses PM2 for automatic process management, providing resilience against crashes and hangs:

**Features:**

- **Auto-restart on crash**: Automatically restarts the process if it exits unexpectedly
- **Hang detection**: Force kills the process after 30 seconds if it becomes unresponsive
- **Memory monitoring**: Restarts if memory usage exceeds 512MB (prevents memory leaks)
- **Restart throttling**: Maximum 10 restarts per minute to prevent restart storms
- **Graceful shutdown**: Waits up to 30 seconds for clean shutdown before force killing
- **Ready signal**: Process sends "ready" signal after Whisper model initialization

**Configuration:**

- PM2 configuration is in `ecosystem.config.js`
- Uses `pm2-runtime` in Docker (foreground mode, proper signal handling)
- Logs are sent to stdout/stderr for Docker log collection

**Monitoring:**

- View logs: `docker exec -it voicenotes pm2 logs`
- Check status: `docker exec -it voicenotes pm2 status`
- View detailed info: `docker exec -it voicenotes pm2 describe audio-transcriber`

**Local development:**

- Use `npm run dev` for development (runs without PM2)
- Use `npm start` or `npm run start:pm2` to test with PM2 locally

## Important Notes

- Service account needs Google Drive API access and must be shared on the Drive folders
- The Whisper model (`Xenova/whisper-medium`) is downloaded on first run and cached
- Temporary files are stored in OS temp directory under `audio-transcriber/`
- Application uses semaphore pattern to prevent concurrent polling cycles
- Files are processed sequentially (not in parallel) to avoid race conditions
- German locale used for date formatting in Obsidian and Fabric integrations
- Tana API has rate limit of 1 call per second per token
- Tana automatically tracks creation timestamps, so transcriptions don't include timestamp prefix
