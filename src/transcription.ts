// Using dynamic import for ESM compatibility
export type TranscriptionResult = {
  text: string;
};

// Whisper model expects 30 seconds of audio at 16kHz
const CHUNK_DURATION_SECONDS = 30;
const SAMPLE_RATE = 16000;
const CHUNK_SIZE = CHUNK_DURATION_SECONDS * SAMPLE_RATE;

export const initializeWhisper = async (): Promise<any> => {
  const { pipeline } = await import("@xenova/transformers");
  return pipeline("automatic-speech-recognition", "Xenova/whisper-medium");
};

const processChunk = async (
  whisperPipeline: any,
  chunk: Float32Array
): Promise<string> => {
  const result = await whisperPipeline(chunk);
  return result.text;
};

export const transcribeAudio = async (
  whisperPipeline: any,
  audioData: Float32Array
): Promise<string> => {
  console.log("Transcribing audio...");

  const chunks: Float32Array[] = [];
  const totalSamples = audioData.length;

  // Split audio into chunks
  for (let start = 0; start < totalSamples; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, totalSamples);
    const chunk = audioData.slice(start, end);
    chunks.push(chunk);
  }

  console.log(`Processing ${chunks.length} chunks...`);

  // Process each chunk and combine results
  const transcriptions: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
    const transcription = await processChunk(whisperPipeline, chunk);
    transcriptions.push(transcription);
  }

  // Combine transcriptions with proper spacing
  return transcriptions.join(" ").replace(/\s+/g, " ").trim();
};
