import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DownloadProgress } from "../types";
import { ProgressModal } from "./ProgressModal";

const progress: DownloadProgress = {
  stages: [
    { id: "video", label: "Download video" },
    { id: "audio", label: "Download audio" },
    { id: "merge", label: "Merge audio and video" },
    { id: "save", label: "Save file" },
  ],
  current: 1,
  fraction: 0.42,
  detail: "1.0 MB of 2.4 MB",
};

function renderModal(props: Partial<ComponentProps<typeof ProgressModal>> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <ProgressModal open title="Me at the zoo" progress={progress} busy savedAs="" error="" onClose={onClose} {...props} />,
  );
  return { ...utils, onClose, dialog: utils.container.querySelector("dialog")! };
}

describe("ProgressModal", () => {
  it("opens and closes the dialog with the open prop", () => {
    const { dialog, rerender, onClose } = renderModal({ open: false });
    expect(dialog.open).toBe(false);
    rerender(<ProgressModal open title="" progress={null} busy savedAs="" error="" onClose={onClose} />);
    expect(dialog.open).toBe(true);
    rerender(<ProgressModal open={false} title="" progress={null} busy savedAs="" error="" onClose={onClose} />);
    expect(dialog.open).toBe(false);
  });

  it("shows the running stage, its progress and detail", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: "Downloading" })).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 4: Download audio")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Download audio" })).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("1.0 MB of 2.4 MB")).toBeInTheDocument();
    expect(screen.getByText(/keep this tab open/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("shows an indeterminate bar when progress can't be measured", () => {
    renderModal({ progress: { ...progress, fraction: null } });
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it("shows 'Preparing' before the first progress event", () => {
    renderModal({ progress: null });
    expect(screen.getByText("Preparing")).toBeInTheDocument();
    expect(screen.getByText("Starting…")).toBeInTheDocument();
  });

  it("can't be dismissed with Escape while busy", () => {
    const { dialog, onClose } = renderModal();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows completion and can be closed", async () => {
    const { dialog, onClose } = renderModal({ busy: false, savedAs: "Me at the zoo.mp4" });
    expect(screen.getByRole("heading", { name: "Download complete" })).toBeInTheDocument();
    expect(screen.getByText("All steps finished")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText(/Saved as Me at the zoo\.mp4/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows the failure and the error message", () => {
    renderModal({ busy: false, error: "ffmpeg merge failed" });
    expect(screen.getByRole("heading", { name: "Download failed" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("ffmpeg merge failed");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
