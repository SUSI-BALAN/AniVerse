import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAnimePage } from "../hooks/useAnimePage";
import { animeFixture } from "../test/fixtures";
import { HomePage } from "./HomePage";

vi.mock("../hooks/useAnimePage");

describe("HomePage", () => {
  it("renders the hero and independent metadata sections", () => {
    vi.mocked(useAnimePage).mockReturnValue({ anime: [animeFixture], pagination: null, loading: false, error: null, retry: vi.fn() });
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Naruto", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trending Now" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top Rated" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Browse by genre" })).toBeInTheDocument();
  });
});
