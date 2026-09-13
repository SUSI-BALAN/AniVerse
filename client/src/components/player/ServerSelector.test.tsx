import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageSelector } from "./LanguageSelector";
import { ServerSelector } from "./ServerSelector";
import type { ProviderInfo } from "../../types/provider";

const providers: ProviderInfo[] = [
  { id: "cinextream", label: "Server 1", enabled: true, status: "AVAILABLE", allowedOrigins: [], capabilities: { supportsAniListId: true, supportsMalId: false, supportsSub: true, supportsDub: true, supportsEpisodeSelection: true, supportsPlaybackEvents: true, supportsResume: false } },
  { id: "yenime", label: "Server 2", enabled: true, status: "MISCONFIGURED", allowedOrigins: [], capabilities: { supportsAniListId: false, supportsMalId: true, supportsSub: true, supportsDub: true, supportsEpisodeSelection: true, supportsPlaybackEvents: false, supportsResume: false } }
];

describe("provider selectors", () => {
  it("shows stable labels and prevents disabled selection", () => { const onChange = vi.fn(); render(<ServerSelector providers={providers} selected="cinextream" onChange={onChange} />); expect(screen.getByRole("button", { name: "Server 1" })).toHaveAttribute("aria-pressed", "true"); const disabled = screen.getByRole("button", { name: "Server 2" }); expect(disabled).toBeDisabled(); fireEvent.click(disabled); expect(onChange).not.toHaveBeenCalled(); });
  it("disables DUB when the selected provider does not support it", () => { const onChange = vi.fn(); render(<LanguageSelector value="sub" capabilities={{ ...providers[0].capabilities, supportsDub: false }} onChange={onChange} />); expect(screen.getByRole("button", { name: "dub" })).toBeDisabled(); fireEvent.click(screen.getByRole("button", { name: "sub" })); expect(onChange).toHaveBeenCalledWith("sub"); });
});
