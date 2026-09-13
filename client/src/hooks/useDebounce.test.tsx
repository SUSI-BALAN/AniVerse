import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  it("waits until the configured pause before updating", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), { initialProps: { value: "na" } });
    rerender({ value: "naruto" });
    expect(result.current).toBe("na");
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe("na");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("naruto");
    vi.useRealTimers();
  });
});
