import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnimePlayer } from "./AnimePlayer";

describe("AnimePlayer", () => {
  it("renders an allowed embed and reacts only to allowed player events", () => {
    const onReady = vi.fn();
    render(<AnimePlayer embedUrl="https://player.example/embed/1" allowedOrigins={["https://player.example"]} providerId="cinextream" animeId={1} episode={1} language="sub" title="Example" onReady={onReady} />);
    expect(screen.getByTitle("Watching Example Episode 1")).toBeInTheDocument();
    fireEvent(window, new MessageEvent("message", { origin: "https://untrusted.example", data: { type: "READY" } }));
    expect(onReady).not.toHaveBeenCalled();
    fireEvent(window, new MessageEvent("message", { origin: "https://player.example", data: { type: "READY" } }));
    expect(onReady).toHaveBeenCalledTimes(1);
  });
  it("rejects unsafe embed URLs", () => { render(<AnimePlayer embedUrl="http://player.example/embed/1" allowedOrigins={["https://player.example"]} providerId="cinextream" animeId={1} episode={1} language="sub" title="Example" />); expect(screen.getByText("Player unavailable")).toBeInTheDocument(); });
});
