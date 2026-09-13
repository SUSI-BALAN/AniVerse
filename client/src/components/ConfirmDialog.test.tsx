import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("is accessible, closes with Escape, and returns focus", async () => {
    const user = userEvent.setup(); const cancel = vi.fn();
    const trigger = document.createElement("button"); trigger.textContent = "trigger"; document.body.append(trigger); trigger.focus();
    const { unmount } = render(<ConfirmDialog title="Clear data?" description="This cannot be undone." onConfirm={vi.fn()} onCancel={cancel} danger />);
    expect(screen.getByRole("dialog", { name: "Clear data?" })).toHaveAttribute("aria-modal", "true");
    await user.keyboard("{Escape}"); expect(cancel).toHaveBeenCalledOnce(); unmount(); expect(trigger).toHaveFocus(); trigger.remove();
  });
  it("requires the configured confirmation phrase", async () => {
    const user = userEvent.setup(); const confirm = vi.fn();
    render(<ConfirmDialog title="Reset?" description="Reset local data." requireText="RESET" onConfirm={confirm} onCancel={vi.fn()} danger />);
    const button = screen.getByRole("button", { name: "Confirm" }); expect(button).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "RESET"); expect(button).toBeEnabled(); await user.click(button); expect(confirm).toHaveBeenCalledOnce();
  });
});
