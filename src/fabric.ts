import { env } from "./config.js";

type CreateNotepadRequest = {
  parentId: string;
  name?: string | null;
  text: string;
  tags?: Array<{ id: string } | { name: string }>;
  comment?: { content: string } | null;
};

type CreateNotepadResponse = {
  id: string;
  kind: "notepad";
  name: string | null;
  url: string;
  createdAt: string;
  modifiedAt: string;
};

const FABRIC_API_BASE = "https://api.fabric.so";
const INBOX_ALIAS = "@alias::inbox";

export const extractTitle = (text: string): string => {
  const trimmedText = text.trim();

  const firstSentenceMatch = trimmedText.match(/^[^.!?]+[.!?]/);
  const firstSentence = firstSentenceMatch?.[0]?.trim() ?? "";

  return firstSentence.length > 0 && firstSentence.length <= 100
    ? firstSentence.replace(/[.!?]$/, "")
    : trimmedText.slice(0, 100);
};

export const createNotepadInFabric = async (
  transcription: string,
  timestamp: Date
): Promise<void> => {
  const config = env();
  const apiKey = config.FABRIC_API_KEY;

  if (!apiKey) {
    throw new Error("FABRIC_API_KEY is not configured");
  }

  const title = extractTitle(transcription);
  const formattedTime = timestamp.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const fullText = `${formattedTime} 🗣️ ${transcription}`;

  const requestBody: CreateNotepadRequest = {
    parentId: INBOX_ALIAS,
    name: title.length > 0 ? title : null,
    text: fullText,
  };

  const response = await fetch(`${FABRIC_API_BASE}/v2/notepads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create notepad in Fabric: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as CreateNotepadResponse;
  console.log(`Created notepad in Fabric: ${data.url}`);
};
