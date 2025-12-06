// Remove dotenv import, as it will be handled in main.ts
import fs, { promises as fsPromises } from "fs";
import { drive_v3, google } from "googleapis";
import * as os from "os";
import path from "path";
import { env } from "./config.js";
import { log } from "./log.js";
import { parseDatetimeFromFilename } from "./parseFilename.js";

// Function to get the service account file path
const getServiceAccountFilePath = (): string => {
  const configuredPath = env().GOOGLE_SERVICE_ACCOUNT_FILE;

  // If the path is already absolute, return it as is
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  // Check for Docker config directory
  const dockerConfigPath = path.join(
    process.cwd(),
    "config",
    "service-account-key.json"
  );
  if (fs.existsSync(dockerConfigPath)) {
    return dockerConfigPath;
  }

  // Fall back to the original path
  return configuredPath;
};

// Configuration from environment variables

// Audio file MIME types we'll look for
const AUDIO_MIME_TYPES = [
  "audio/mpeg", // .mp3
  "audio/wav", // .wav
  "audio/x-wav", // .wav
  "audio/x-m4a", // .m4a
  "audio/mp4", // .m4a (alternative)
  "application/octet-stream", // Fallback for unrecognized types
];

// Setup Drive API client
export const getDriveClient = () => {
  const SERVICE_ACCOUNT_FILE = getServiceAccountFilePath();
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });

  return google.drive({ version: "v3", auth });
};

// Move a file to the processed folder
export const moveFileToProcessed = async (
  driveClient: drive_v3.Drive,
  fileId: string
): Promise<void> => {
  const PROCESSED_FOLDER_ID = env().GOOGLE_DRIVE_PROCESSED_FOLDER_ID;

  try {
    // First verify we can access the processed folder
    console.log(
      `Verifying access to processed folder (ID: ${PROCESSED_FOLDER_ID})...`
    );
    await driveClient.files.get({
      fileId: PROCESSED_FOLDER_ID,
      fields: "id, name",
    });
    console.log("Successfully verified processed folder access");

    // Get the file's current parents and name
    console.log(`Getting file details (ID: ${fileId})...`);
    const file = await driveClient.files.get({
      fileId,
      fields: "parents, name",
    });
    console.log(`File name: ${file.data.name}`);
    console.log(`Current parents: ${file.data.parents?.join(", ")}`);

    const previousParents = file.data.parents?.join(",");

    // Move the file to the processed folder
    console.log(`Attempting to move file to processed folder...`);
    await driveClient.files.update({
      fileId,
      addParents: PROCESSED_FOLDER_ID,
      removeParents: previousParents,
      fields: "id, parents",
    });

    console.log(`Successfully moved file ${fileId} to processed folder`);
  } catch (error: any) {
    console.error(`Error moving file ${fileId} to processed folder:`);
    console.error(`Error type: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    if (error.response?.data?.error) {
      console.error(
        `Google API Error:`,
        JSON.stringify(error.response.data.error, null, 2)
      );
    }
    throw error;
  }
};

// Check for new audio files in the specified folder
export const checkForNewFiles = async (
  driveClient: drive_v3.Drive,
  processFile: (filePath: string, timestamp: Date | null) => Promise<void>
) => {
  const FOLDER_ID = env().GOOGLE_DRIVE_FOLDER_ID;
  if (!FOLDER_ID) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID env variable not set");
  }

  const mimeTypeQuery = AUDIO_MIME_TYPES.map(
    (type) => `mimeType='${type}'`
  ).join(" or ");
  const query = `'${FOLDER_ID}' in parents and (${mimeTypeQuery}) and trashed=false`;

  try {
    console.log(`Querying Google Drive for new files: ${query}`);
    const response = await driveClient.files.list({
      q: query,
      fields: "files(id, name, createdTime, mimeType)",
      orderBy: "createdTime desc",
    });

    const files = response.data.files || [];
    console.log(`Found ${files.length} files to check...`);

    if (files.length === 0) {
      return;
    }

    log(`Found ${files.length} audio files to check...`);

    // Sort files by name to ensure timestamps in filenames are processed in order
    const sortedFiles = [...files].sort((a, b) => {
      return (a.name || "").localeCompare(b.name || "");
    });

    // Process files sequentially instead of in parallel to avoid race conditions
    for (const file of sortedFiles) {
      if (!file.id) {
        continue;
      }

      console.log(`Found new file: ${file.name} (ID: ${file.id})`);
      await downloadAndProcessFile(driveClient, file, processFile);
    }
  } catch (error) {
    console.error("Error checking for new files:", error);
  }
};

// Download and process a single file
export const downloadAndProcessFile = async (
  driveClient: drive_v3.Drive,
  file: drive_v3.Schema$File,
  processFile: (filePath: string, timestamp: Date | null) => Promise<void>
) => {
  if (!file.id || !file.name) {
    console.error("File ID or name is missing");
    return;
  }

  try {
    // Parse time from filename
    const timestamp = parseDatetimeFromFilename(file.name);
    console.log(`Parsed timestamp from filename: ${timestamp}`);

    // Create temp directory if it doesn't exist
    const tempDir = path.join(os.tmpdir(), "audio-transcriber");
    await fsPromises.mkdir(tempDir, { recursive: true });

    // Temporary file path
    const tempFilePath = path.join(tempDir, file.name);

    // Download the file
    console.log(`Downloading file: ${file.name}`);
    const response = await driveClient.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "stream" }
    );

    // Write the file to disk
    const fileStream = fs.createWriteStream(tempFilePath);

    await new Promise<void>((resolve, reject) => {
      response.data
        .on("end", () => {
          resolve();
        })
        .on("error", (err: Error) => {
          reject(err);
        })
        .pipe(fileStream);
    });

    // Process the downloaded file with timestamp
    await processFile(tempFilePath, timestamp);

    // Move the file to processed folder
    await moveFileToProcessed(driveClient, file.id);

    // Clean up the temporary file
    await fsPromises.unlink(tempFilePath).catch((err) => {
      console.error(`Error removing temporary file ${tempFilePath}:`, err);
    });
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error);
    throw error;
  }
};

// Start watching for new files in Google Drive
export const startWatchingDrive = async (
  processFile: (filePath: string, timestamp: Date | null) => Promise<void>
): Promise<void> => {
  const intervalSeconds = env().POLLING_INTERVAL_MS / 1000;
  const FOLDER_ID = env().GOOGLE_DRIVE_FOLDER_ID;

  console.log(
    `Polling Google Drive folder every ${intervalSeconds} seconds. Folder ID: ${FOLDER_ID}`
  );

  const driveClient = getDriveClient();

  // Semaphore to prevent overlapping processing cycles
  let isProcessing = false;

  // Function to check for new files with semaphore protection
  const checkForNewFilesWithGuard = async () => {
    // If we're already processing, skip this cycle
    if (isProcessing) {
      console.log(
        "Previous Google Drive polling cycle still running, skipping..."
      );
      return;
    }

    // Set the semaphore to indicate processing is in progress
    isProcessing = true;

    try {
      await checkForNewFiles(driveClient, processFile);
    } catch (error) {
      console.error("Error during polling interval:", error);
    } finally {
      // Always release the semaphore when done, even if there was an error
      isProcessing = false;
    }
  };

  // Process files immediately on startup
  await checkForNewFilesWithGuard();

  // Then continue polling at regular intervals
  const intervalId = setInterval(
    checkForNewFilesWithGuard,
    env().POLLING_INTERVAL_MS
  );

  // Handle graceful shutdown
  const cleanup = (): void => {
    clearInterval(intervalId);
    console.log("Polling stopped, exiting...");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
};
