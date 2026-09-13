import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimeImage } from "./AnimeImage";

describe("AnimeImage", () => {
  it("shows a stable fallback for missing and failed images", () => {
    const { rerender } = render(<AnimeImage src={null} alt="Missing cover" className="aspect-[2/3]" />);
    expect(screen.getByRole("img", { name: "Missing cover image unavailable" })).toBeInTheDocument();
    rerender(<AnimeImage src="broken.jpg" alt="Broken cover" className="aspect-[2/3]" />);
    fireEvent.error(screen.getByRole("img", { name: "Broken cover" }));
    expect(screen.getByRole("img", { name: "Broken cover image unavailable" })).toBeInTheDocument();
  });
});
