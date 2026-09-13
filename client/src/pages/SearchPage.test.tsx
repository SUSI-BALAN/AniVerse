import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAnimeSearch } from "../hooks/useAnimeSearch";
import { useDebounce } from "../hooks/useDebounce";
import { animeFixture } from "../test/fixtures";
import { SearchPage } from "./SearchPage";
import { LibraryProvider } from "../context/LibraryContext";

vi.mock("../hooks/useAnimeSearch");
vi.mock("../hooks/useDebounce");

const baseResult = { pagination: null, loading: false, error: null, retry: vi.fn() };

describe("SearchPage", () => {
  beforeEach(() => {
    vi.mocked(useDebounce).mockImplementation((value) => value);
    vi.mocked(useAnimeSearch).mockReturnValue({ ...baseResult, anime: [] });
  });

  it("shows an intentional empty state before a query", () => {
    render(<MemoryRouter><LibraryProvider><SearchPage /></LibraryProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Start with a title" })).toBeInTheDocument();
  });

  it("renders search results and a no-results message", () => {
    vi.mocked(useAnimeSearch).mockReturnValue({ ...baseResult, anime: [animeFixture] });
    const { rerender } = render(<MemoryRouter><LibraryProvider><SearchPage /></LibraryProvider></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Search anime"), { target: { value: "Naruto" } });
    expect(screen.getByRole("heading", { name: "Naruto" })).toBeInTheDocument();

    vi.mocked(useAnimeSearch).mockReturnValue({ ...baseResult, anime: [] });
    rerender(<MemoryRouter><LibraryProvider><SearchPage /></LibraryProvider></MemoryRouter>);
    expect(screen.getByText(/No anime found for 'Naruto'/)).toBeInTheDocument();
  });

  it("shows friendly loading and error states", () => {
    vi.mocked(useAnimeSearch).mockReturnValue({ ...baseResult, anime: [], loading: true });
    const { rerender } = render(<MemoryRouter><LibraryProvider><SearchPage /></LibraryProvider></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Search anime"), { target: { value: "Bleach" } });
    expect(screen.getByLabelText("Loading anime")).toBeInTheDocument();

    vi.mocked(useAnimeSearch).mockReturnValue({ ...baseResult, anime: [], error: "Unable to load anime." });
    rerender(<MemoryRouter><LibraryProvider><SearchPage /></LibraryProvider></MemoryRouter>);
    expect(screen.getByText("Unable to load search results.")).toBeInTheDocument();
  });
});
