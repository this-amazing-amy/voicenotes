import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import pkg from "wavefile";
const { WaveFile } = pkg;

export const convertToWav = (inputPath: string): Promise<string> => {
  const outputPath = inputPath.replace(/\.[^/.]+$/, "") + ".wav";

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat("wav")
      .audioFrequency(16000)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .save(outputPath);
  });
};

export const processAudioData = async (
  wavPath: string
): Promise<Float32Array> => {
  const buffer = await fs.readFile(wavPath);

  // Read .wav file and convert it to required format
  const wav = new WaveFile(buffer);
  wav.toBitDepth("32f"); // Pipeline expects input as a Float32Array
  wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000

  let audioData = wav.getSamples();
  if (Array.isArray(audioData)) {
    if (audioData.length > 1) {
      const SCALING_FACTOR = Math.sqrt(2);

      // Merge channels (into first channel to save memory)
      for (let i = 0; i < audioData[0].length; ++i) {
        audioData[0][i] =
          (SCALING_FACTOR * (audioData[0][i] + audioData[1][i])) / 2;
      }
    }

    // Select first channel
    audioData = audioData[0];
  }

  // Ensure we return a Float32Array
  if (!(audioData instanceof Float32Array)) {
    // Convert to Float32Array if it's not already
    const float32Data = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      float32Data[i] = audioData[i];
    }
    return float32Data;
  }

  return audioData;
};
