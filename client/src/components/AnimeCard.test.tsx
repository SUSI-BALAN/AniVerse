import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { animeFixture } from "../test/fixtures";
import { AnimeCard } from "./AnimeCard";

describe("AnimeCard", () => {
  it("renders normalized metadata and links to details", () => {
    render(<MemoryRouter><AnimeCard anime={animeFixture} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Naruto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Score 80 percent")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View details for Naruto" })).toHaveAttribute("href", "/anime/1");
    expect(screen.getByText("220 episodes")).toBeInTheDocument();
  });

  it("does not invent a missing score", () => {
    render(<MemoryRouter><AnimeCard anime={{ ...animeFixture, averageScore: null }} /></MemoryRouter>);
    expect(screen.queryByLabelText(/Score/)).not.toBeInTheDocument();
  });
});
