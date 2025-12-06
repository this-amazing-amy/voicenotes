import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We need to mock the env function since it relies on process.env
describe("config validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and clear all mocks
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should validate required environment variables", async () => {
    // Set up valid environment variables
    process.env.OBSIDIAN_VAULT_ROOT = "/path/to/vault";
    process.env.POLLING_INTERVAL_MS = "5000";
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE = "/path/to/service-account.json";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "folder-id-123";
    process.env.GOOGLE_DRIVE_PROCESSED_FOLDER_ID = "processed-folder-id-456";

    // Dynamically import to get fresh module with current env vars
    const { env } = await import("./config.js");

    const config = env();

    expect(config.OBSIDIAN_VAULT_ROOT).toBe("/path/to/vault");
    expect(config.POLLING_INTERVAL_MS).toBe(5000);
    expect(config.GOOGLE_SERVICE_ACCOUNT_FILE).toBe(
      "/path/to/service-account.json"
    );
    expect(config.GOOGLE_DRIVE_FOLDER_ID).toBe("folder-id-123");
    expect(config.GOOGLE_DRIVE_PROCESSED_FOLDER_ID).toBe(
      "processed-folder-id-456"
    );
  });

  it("should coerce polling interval to number", async () => {
    process.env.OBSIDIAN_VAULT_ROOT = "/path/to/vault";
    process.env.POLLING_INTERVAL_MS = "10000"; // String
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE = "/path/to/service-account.json";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "folder-id-123";
    process.env.GOOGLE_DRIVE_PROCESSED_FOLDER_ID = "processed-folder-id-456";

    const { env } = await import("./config.js");
    const config = env();

    expect(typeof config.POLLING_INTERVAL_MS).toBe("number");
    expect(config.POLLING_INTERVAL_MS).toBe(10000);
  });
});
