import { fireEvent, render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAnimePage } from "../hooks/useAnimePage";
import { BrowsePage } from "./BrowsePage";

vi.mock("../hooks/useAnimePage");

describe("BrowsePage", () => {
  it("opens mobile filters and exposes selected filter chips", () => {
    vi.mocked(useAnimePage).mockReturnValue({ anime: [], pagination: null, loading: false, error: null, retry: vi.fn() });
    render(<MemoryRouter><BrowsePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Browse filters" });
    fireEvent.change(dialog.querySelector('select')!, { target: { value: "Action" } });
    expect(screen.getByRole("button", { name: /Action/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("keeps keyboard focus inside the filter drawer and restores it on close", async () => {
    vi.mocked(useAnimePage).mockReturnValue({ anime: [], pagination: null, loading: false, error: null, retry: vi.fn() });
    render(<MemoryRouter><BrowsePage /></MemoryRouter>);
    const trigger = screen.getByRole("button", { name: "Filters" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Browse filters" });
    const close = screen.getByRole("button", { name: "Close" });
    const showResults = screen.getByRole("button", { name: "Show results" });
    expect(close).toHaveFocus();

    showResults.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitForElementToBeRemoved(dialog);
    expect(trigger).toHaveFocus();
  });
});
