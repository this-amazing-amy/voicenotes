import { promises as fs } from "fs";
import { convertToWav, processAudioData } from "./audio.js";
import { env } from "./config.js";
import { startWatchingDrive } from "./drive.js";
import { createNotepadInFabric } from "./fabric.js";
import { appendToObsidianDailyNote } from "./obsidian.js";
import { createNodeInTana } from "./tana.js";
import { initializeWhisper, transcribeAudio } from "./transcription.js";
import { log } from "console";

let whisperPipeline: any;

const processAudioFile = async (
  filePath: string,
  timestamp: Date | null
): Promise<void> => {
  try {
    console.log(`🎵 Processing file: ${filePath}`);
    const isWav = filePath.endsWith(".wav");
    const wavPath = isWav ? filePath : await convertToWav(filePath);

    console.log("🔊 Processing audio data...");
    const audioData = await processAudioData(wavPath);
    const transcription = await transcribeAudio(whisperPipeline, audioData);

    const config = env();
    const target = config.TRANSCRIPTION_TARGET;

    if (target === "fabric") {
      await createNotepadInFabric(transcription, timestamp ?? new Date());
    } else if (target === "tana") {
      await createNodeInTana(transcription, timestamp ?? new Date());
    } else {
      await appendToObsidianDailyNote(transcription, timestamp);
    }

    if (!isWav) {
      await fs.unlink(wavPath);
    }

    console.log(`Successfully processed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
};

const main = async (): Promise<void> => {
  const config = env();
  console.log(`Transcribing to: ${config.TRANSCRIPTION_TARGET}`);

  console.log("Initializing whisper model...");
  whisperPipeline = await initializeWhisper();

  if (process.send) {
    process.send("ready");
  }

  console.log("Starting Google Drive polling...");
  await startWatchingDrive(processAudioFile);
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

const runMainWithRetry = async (retriesLeft: number): Promise<void> => {
  try {
    await main();
  } catch (error) {
    console.error("Main process crashed:", error);
    if (retriesLeft > 0) {
      console.log(
        `Retrying in ${
          RETRY_DELAY_MS / 1000
        } seconds... (${retriesLeft} retries left)`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      await runMainWithRetry(retriesLeft - 1);
    } else {
      console.error("Max retries reached. Exiting.");
      process.exit(1); // Exit with error code after max retries
    }
  }
};

// Start the application with retry logic
runMainWithRetry(MAX_RETRIES).catch((err) => {
  // This catch is for errors potentially thrown by runMainWithRetry itself, although unlikely
  console.error("Unhandled error in retry logic:", err);
  process.exit(1);
});
