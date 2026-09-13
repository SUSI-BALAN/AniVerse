import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { animeFixture } from "../test/fixtures";
import { AnimeHero } from "./AnimeHero";

describe("AnimeHero", () => {
  it("shows real anime metadata and links to details", () => {
    render(<MemoryRouter><AnimeHero anime={[animeFixture]} loading={false} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Naruto" })).toBeInTheDocument();
    expect(screen.getByText("220 episodes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /More info/ })).toHaveAttribute("href", "/anime/1");
  });

  it("supports manual carousel controls", () => {
    const second = { ...animeFixture, id: 2, title: { ...animeFixture.title, english: "Bleach" } };
    render(<MemoryRouter><AnimeHero anime={[animeFixture, second]} loading={false} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Next featured anime" }));
    expect(screen.getByRole("heading", { name: "Bleach" })).toBeInTheDocument();
  });
});
