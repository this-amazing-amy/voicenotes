import { promises as fs } from "fs";
import path from "path";
import { env } from "./config.js";

const getObsidianDailyNotePath = (date: Date): string => {
  const vaultRoot = env().OBSIDIAN_VAULT_ROOT;

  if (!vaultRoot) {
    throw new Error(
      "OBSIDIAN_VAULT_ROOT is not configured. Set TRANSCRIPTION_TARGET to 'obsidian' and provide OBSIDIAN_VAULT_ROOT."
    );
  }

  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  const day = date.getDate();
  const monthName = date.toLocaleString("de-DE", { month: "long" });
  const paddedMonth = String(month + 1).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  // Format: 01 - Daily Notes/YYYY/MM - MMMM/DD. MMMM YYYY.md
  return path.join(
    vaultRoot,
    "01 - Journal",
    String(year),
    `${paddedMonth} - ${monthName}`,
    `${paddedDay}. ${monthName} ${year}.md`
  );
};

export const appendToObsidianDailyNote = async (
  text: string,
  timestamp: Date | null
): Promise<void> => {
  const date = timestamp ?? new Date();
  const formatter = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const hoursAndMinutes = formatter.format(date);

  const textWithTimestamp = hoursAndMinutes
    ? `- [ ] ${hoursAndMinutes} 🗣️ ${text}`
    : `- [ ] 🗣️ ${text}`;

  const notePath = getObsidianDailyNotePath(date);
  console.log(`Note path: ${notePath}`);
  await fs.mkdir(path.dirname(notePath), { recursive: true });

  let fileContent: string;
  try {
    fileContent = await fs.readFile(notePath, "utf-8");
  } catch {
    // File doesn't exist, read template and create file
    const vaultRoot = env().OBSIDIAN_VAULT_ROOT;

    if (!vaultRoot) {
      throw new Error(
        "OBSIDIAN_VAULT_ROOT is not configured. Set TRANSCRIPTION_TARGET to 'obsidian' and provide OBSIDIAN_VAULT_ROOT."
      );
    }

    const templatePath = path.join(
      vaultRoot,
      "09 - Templates",
      "Daily Note.md"
    );

    try {
      const templateContent = await fs.readFile(templatePath, "utf-8");
      fileContent = templateContent;
      await fs.writeFile(notePath, templateContent);
    } catch {
      // Template doesn't exist, start with empty content
      fileContent = "";
    }
  }

  const needsNewline = fileContent.length > 0 && !fileContent.endsWith("\n");
  await fs.appendFile(
    notePath,
    `${needsNewline ? "\n" : ""}${textWithTimestamp}`
  );
};

export { getObsidianDailyNotePath };
