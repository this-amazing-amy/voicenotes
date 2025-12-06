import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), "config", ".env") });

const transcriptionTargetSchema = z.enum(["obsidian", "fabric", "tana"]);

const environmentSchema = z
  .object({
    TRANSCRIPTION_TARGET: transcriptionTargetSchema.default("obsidian"),
    OBSIDIAN_VAULT_ROOT: z.string().optional(),
    FABRIC_API_KEY: z.string().optional(),
    TANA_API_TOKEN: z.string().optional(),
    TANA_SUPERTAG_ID: z.string().optional(),
    POLLING_INTERVAL_MS: z.coerce.number(),

    GOOGLE_SERVICE_ACCOUNT_FILE: z.string(),
    GOOGLE_DRIVE_FOLDER_ID: z.string(),
    GOOGLE_DRIVE_PROCESSED_FOLDER_ID: z.string(),
  })
  .refine(
    (data) => {
      if (data.TRANSCRIPTION_TARGET === "obsidian") {
        return !!data.OBSIDIAN_VAULT_ROOT;
      }
      if (data.TRANSCRIPTION_TARGET === "fabric") {
        return !!data.FABRIC_API_KEY;
      }
      if (data.TRANSCRIPTION_TARGET === "tana") {
        return !!data.TANA_API_TOKEN;
      }
      return true;
    },
    {
      message:
        "OBSIDIAN_VAULT_ROOT is required when TRANSCRIPTION_TARGET is 'obsidian', FABRIC_API_KEY is required when target is 'fabric', TANA_API_TOKEN is required when target is 'tana'",
    }
  );

export const env = () => {
  const parsed = environmentSchema.safeParse({
    TRANSCRIPTION_TARGET: process.env.TRANSCRIPTION_TARGET,
    OBSIDIAN_VAULT_ROOT: process.env.OBSIDIAN_VAULT_ROOT,
    FABRIC_API_KEY: process.env.FABRIC_API_KEY,
    TANA_API_TOKEN: process.env.TANA_API_TOKEN,
    TANA_SUPERTAG_ID: process.env.TANA_SUPERTAG_ID,
    POLLING_INTERVAL_MS: process.env.POLLING_INTERVAL_MS,
    GOOGLE_SERVICE_ACCOUNT_FILE: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
    GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
    GOOGLE_DRIVE_PROCESSED_FOLDER_ID:
      process.env.GOOGLE_DRIVE_PROCESSED_FOLDER_ID,
  });

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error);
    process.exit(1);
  }

  return parsed.data;
};
