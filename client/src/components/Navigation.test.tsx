import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MobileNav } from "./MobileNav";
import { Navbar } from "./Navbar";

describe("navigation", () => {
  it("renders desktop and mobile navigation with active routes", () => {
    render(<MemoryRouter initialEntries={["/browse"]}><Navbar /><MobileNav /></MemoryRouter>);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeInTheDocument();
    const browseLinks = screen.getAllByRole("link", { name: "Browse" });
    expect(browseLinks).toHaveLength(2);
    browseLinks.forEach((link) => expect(link).toHaveAttribute("aria-current", "page"));
  });
});
