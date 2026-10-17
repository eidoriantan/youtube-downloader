import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoadState } from "../types";
import { useEngine } from "./useEngine";

const store = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    state: { steps: [], ready: false, error: null } as LoadState,
    listeners,
    startLoading: vi.fn(),
    set(next: LoadState) {
      this.state = next;
      listeners.forEach((l) => l());
    },
  };
});

vi.mock("../lib/loader", () => ({
  getLoadState: () => store.state,
  subscribe: (l: () => void) => {
    store.listeners.add(l);
    return () => store.listeners.delete(l);
  },
  startLoading: store.startLoading,
}));

beforeEach(() => {
  store.state = { steps: [], ready: false, error: null };
  store.startLoading.mockReset().mockResolvedValue(undefined);
});

describe("useEngine", () => {
  it("starts loading on mount and exposes the load state", () => {
    const { result } = renderHook(() => useEngine());
    expect(store.startLoading).toHaveBeenCalled();
    expect(result.current).toMatchObject({ ready: false, error: null, steps: [] });
  });

  it("re-renders when the loader state changes", () => {
    const { result } = renderHook(() => useEngine());
    act(() => store.set({ steps: [], ready: true, error: null }));
    expect(result.current.ready).toBe(true);
  });

  it("swallows loading failures (they are shown via state) and can retry", async () => {
    store.startLoading.mockRejectedValue(new Error("x"));
    const { result } = renderHook(() => useEngine());
    store.startLoading.mockClear();
    await act(async () => result.current.retry());
    expect(store.startLoading).toHaveBeenCalledTimes(1);
  });
});
