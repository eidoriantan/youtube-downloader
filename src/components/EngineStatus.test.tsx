import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LoadStep } from "../types";
import { EngineStatus } from "./EngineStatus";

const steps: LoadStep[] = [
  { id: "runtime", label: "Python runtime", state: "done" },
  { id: "packages", label: "Package installer", state: "done" },
  { id: "ytdlp", label: "yt-dlp", state: "active" },
  { id: "ffmpeg", label: "ffmpeg for merging", state: "pending" },
];

describe("EngineStatus", () => {
  it("renders nothing once ready", () => {
    const { container } = render(<EngineStatus steps={steps} ready error={null} onRetry={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists every step and how many are done", () => {
    render(<EngineStatus steps={steps} ready={false} error={null} onRetry={() => {}} />);
    expect(screen.getByRole("heading", { name: "Getting things ready" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Loading tools" })).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(steps.map((s) => s.label));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the error with a retry button", async () => {
    const onRetry = vi.fn();
    render(<EngineStatus steps={steps} ready={false} error="network unreachable" onRetry={onRetry} />);
    expect(screen.getByRole("heading", { name: "Couldn't finish loading" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("network unreachable");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
