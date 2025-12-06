import { env } from "./config.js";

type TanaNode = {
  name: string;
  description?: string;
  supertags?: Array<{ id: string }>;
};

type TanaPayload = {
  targetNodeId: string;
  nodes: TanaNode[];
};

const TANA_API_ENDPOINT =
  "https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2";
const TANA_INBOX = "INBOX";

export const createNodeInTana = async (
  transcription: string,
  timestamp: Date
): Promise<void> => {
  const config = env();
  const apiToken = config.TANA_API_TOKEN;

  if (!apiToken) {
    throw new Error("TANA_API_TOKEN is not configured");
  }

  const node: TanaNode = {
    name: transcription,
  };

  const supertagId = config.TANA_SUPERTAG_ID;
  if (supertagId) {
    node.supertags = [{ id: supertagId }];
  }

  const payload: TanaPayload = {
    targetNodeId: TANA_INBOX,
    nodes: [node],
  };

  const response = await fetch(TANA_API_ENDPOINT, {
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
      `Failed to create node in Tana: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  console.log(`Created node in Tana inbox`);
};

