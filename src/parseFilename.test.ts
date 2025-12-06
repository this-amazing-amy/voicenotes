import { describe, expect, it } from "vitest";
import { parseDatetimeFromFilename } from "./parseFilename.js";

describe("parseDatetimeFromFilename", () => {
  it("should parse valid datetime from filename", () => {
    const filename = "2025-06-15T 13-07 1.m4a";
    const result = parseDatetimeFromFilename(filename);
    console.log("result", result);

    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(5); // June is 5
    expect(result?.getDate()).toBe(15);
    expect(result?.getHours()).toBe(13);
    expect(result?.getMinutes()).toBe(7);
    expect(result?.toISOString()).toBe("2025-06-15T11:07:00.000Z");
  });
});
