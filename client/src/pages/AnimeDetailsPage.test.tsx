import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAnimeDetails } from "../services/animeApi";
import { detailsFixture } from "../test/fixtures";
import { AnimeDetailsPage } from "./AnimeDetailsPage";
import { LibraryProvider } from "../context/LibraryContext";

vi.mock("../services/animeApi", () => ({ getAnimeDetails: vi.fn() }));

function renderPage(path = "/anime/1") {
  return render(<MemoryRouter initialEntries={[path]}><LibraryProvider><Routes><Route path="/anime/:id" element={<AnimeDetailsPage />} /></Routes></LibraryProvider></MemoryRouter>);
}

describe("AnimeDetailsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads and renders details with safe plain text", async () => {
    vi.mocked(getAnimeDetails).mockResolvedValue(detailsFixture);
    renderPage();
    expect(await screen.findByRole("heading", { name: "Naruto", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("A young ninja pursues his dream.")).toBeInTheDocument();
    expect(screen.getByText("220 episodes")).toBeInTheDocument();
  });

  it("rejects invalid route IDs without calling the API", async () => {
    renderPage("/anime/nope");
    expect(await screen.findByRole("heading", { name: "Anime not found" })).toBeInTheDocument();
    expect(getAnimeDetails).not.toHaveBeenCalled();
  });

  it("shows the not-found state when AniList has no matching numeric ID", async () => {
    vi.mocked(getAnimeDetails).mockRejectedValue(Object.assign(new Error("Anime not found"), { status: 404 }));
    renderPage("/anime/999999");
    expect(await screen.findByRole("heading", { name: "Anime not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to browse" })).toHaveAttribute("href", "/browse");
  });

  it("expands and collapses long descriptions", async () => {
    vi.mocked(getAnimeDetails).mockResolvedValue({ ...detailsFixture, description: "Long story. ".repeat(80) });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Read more" }));
    expect(screen.getByRole("button", { name: "Read less" })).toHaveAttribute("aria-expanded", "true");
  });
});
