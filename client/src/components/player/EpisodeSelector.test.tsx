import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EpisodeSelector } from "./EpisodeSelector";

describe("EpisodeSelector", () => {
  it("renders the current range and selects episodes", () => { const onSelect = vi.fn(); render(<EpisodeSelector currentEpisode={52} totalEpisodes={120} onSelectEpisode={onSelect} />); expect(screen.getByRole("button", { name: "Episode 52" })).toHaveAttribute("aria-current", "true"); fireEvent.click(screen.getByRole("button", { name: "Episode 53" })); expect(onSelect).toHaveBeenCalledWith(53); });
  it("handles unknown episode counts without inventing a total", () => { render(<EpisodeSelector currentEpisode={2} totalEpisodes={null} onSelectEpisode={vi.fn()} />); expect(screen.getByRole("button", { name: "Episode 2" })).toBeInTheDocument(); expect(screen.queryByText(/–/)).not.toBeInTheDocument(); });
});
