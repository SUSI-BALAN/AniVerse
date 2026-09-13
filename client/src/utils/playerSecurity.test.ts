import { describe, expect, it } from "vitest";
import { isAllowedEmbedUrl, parsePlayerMessage } from "./playerSecurity";

describe("player security helpers", () => {
  it("accepts only HTTPS URLs from approved origins", () => { expect(isAllowedEmbedUrl("https://player.example/embed/1", ["https://player.example"])).toBe(true); expect(isAllowedEmbedUrl("javascript:alert(1)", ["https://player.example"])).toBe(false); expect(isAllowedEmbedUrl("https://evil.example/embed/1", ["https://player.example"])).toBe(false); });
  it("validates message origin and normalized time payloads", () => { expect(parsePlayerMessage(new MessageEvent("message", { origin: "https://evil.example", data: { type: "READY" } }), ["https://player.example"])).toBeNull(); expect(parsePlayerMessage(new MessageEvent("message", { origin: "https://player.example", data: { type: "time", time: 4, duration: 20 } }), ["https://player.example"])).toEqual({ type: "TIME_UPDATE", currentTime: 4, duration: 20 }); expect(parsePlayerMessage(new MessageEvent("message", { origin: "https://player.example", data: { type: "time", time: -1, duration: 20 } }), ["https://player.example"])).toBeNull(); });
});
