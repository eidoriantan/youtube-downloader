import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { INFO } from "./test/fixtures";
import type { DownloadOptions } from "./types";

const mocks = vi.hoisted(() => ({
  listFormats: vi.fn(), downloadMedia: vi.fn(), syncProxy: vi.fn(), startLoading: vi.fn(),
}));
// useSyncExternalStore needs the same snapshot object on every call.
const loadState = vi.hoisted(() => ({ steps: [], ready: true, error: null }));
vi.mock("./lib/engine", () => ({ listFormats: mocks.listFormats, downloadMedia: mocks.downloadMedia }));
vi.mock("./lib/pyodide", () => ({ syncProxy: mocks.syncProxy }));
vi.mock("./lib/loader", () => ({
  startLoading: mocks.startLoading,
  subscribe: () => () => {},
  getLoadState: () => loadState,
}));

const VIDEO = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.startLoading.mockResolvedValue(undefined);
  mocks.listFormats.mockResolvedValue(INFO);
  mocks.downloadMedia.mockImplementation(async ({ onProgress }: DownloadOptions) => {
    onProgress({ stages: [{ id: "video", label: "Download video" }, { id: "save", label: "Save file" }], current: 1, fraction: 1, detail: "" });
    return "Me at the zoo.mp4";
  });
});

async function getFormats() {
  await userEvent.type(screen.getByLabelText("Video URL"), VIDEO);
  await userEvent.click(screen.getByRole("button", { name: "Get formats" }));
  await screen.findByRole("heading", { name: "Me at the zoo" });
}

describe("App", () => {
  it("starts loading the engine on mount", () => {
    render(<App />);
    expect(mocks.startLoading).toHaveBeenCalled();
  });

  it("needs a URL and a proxy before fetching formats", async () => {
    render(<App />);
    const button = screen.getByRole("button", { name: "Get formats" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Video URL"), VIDEO);
    expect(button).toBeEnabled();
    await userEvent.clear(screen.getByLabelText("Proxy URL"));
    expect(button).toBeDisabled();
  });

  it("uses a custom proxy for fetching formats and remembers it", async () => {
    render(<App />);
    const proxy = screen.getByLabelText("Proxy URL");
    await userEvent.clear(proxy);
    await userEvent.type(proxy, "http://localhost:8787");
    await getFormats();
    expect(mocks.listFormats).toHaveBeenCalledWith("http://localhost:8787", VIDEO, expect.any(Function));
    expect(localStorage.getItem("proxy")).toBe("http://localhost:8787");
    expect(mocks.syncProxy).toHaveBeenLastCalledWith("http://localhost:8787");
  });

  it("fetches formats on Enter", async () => {
    render(<App />);
    await userEvent.type(screen.getByLabelText("Video URL"), `${VIDEO}{Enter}`);
    expect(await screen.findByRole("heading", { name: "Me at the zoo" })).toBeInTheDocument();
  });

  it("downloads the default format and shows the result in the modal", async () => {
    render(<App />);
    await getFormats();
    expect(screen.getByRole("radio", { name: /640x360/ })).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "Convert to MP3" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Download complete" })).toBeInTheDocument();
    expect(mocks.downloadMedia).toHaveBeenCalledWith(expect.objectContaining({ format: expect.objectContaining({ format_id: "18" }) }));

    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers MP3 conversion for audio-only formats and passes the options", async () => {
    render(<App />);
    await getFormats();
    await userEvent.click(screen.getByRole("radio", { name: /130 kbps/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Convert to MP3" }));
    await userEvent.selectOptions(screen.getByRole("combobox"), "128");
    await userEvent.type(screen.getByLabelText("Artist"), "jawed");
    await userEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(mocks.downloadMedia).toHaveBeenCalledWith(expect.objectContaining({
      format: expect.objectContaining({ format_id: "140" }),
      mp3: { bitrate: 128, metadata: expect.objectContaining({ artist: "jawed" }) },
    }));
  });

  it("shows errors from fetching formats", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.listFormats.mockRejectedValue(new Error("ERROR: [youtube] x: Video unavailable"));
    render(<App />);
    await userEvent.type(screen.getByLabelText("Video URL"), VIDEO);
    await userEvent.click(screen.getByRole("button", { name: "Get formats" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("[youtube] x: Video unavailable");
  });
});
