import { env } from "./config.js";

type SaveToDailyNoteRequest = {
  spaceId: string;
  mdText: string;
  localDate?: string;
  origin?: string;
};

const CAPACITIES_API_ENDPOINT = "https://api.capacities.io/save-to-daily-note";

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const saveToDailyNoteInCapacities = async (
  transcription: string,
  timestamp: Date
): Promise<void> => {
  const config = env();
  const apiToken = config.CAPACITIES_API_TOKEN;
  const spaceId = config.CAPACITIES_SPACE_ID;

  if (!apiToken) {
    throw new Error("CAPACITIES_API_TOKEN is not configured");
  }

  if (!spaceId) {
    throw new Error("CAPACITIES_SPACE_ID is not configured");
  }

  const formattedTime = timestamp.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const mdText = `${formattedTime} 🗣️ ${transcription}`;
  const localDate = formatDate(timestamp);

  const payload: SaveToDailyNoteRequest = {
    spaceId,
    mdText,
    localDate,
  };

  const response = await fetch(CAPACITIES_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to save to Capacities daily note: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  console.log(`Saved transcription to Capacities daily note for ${localDate}`);
};
