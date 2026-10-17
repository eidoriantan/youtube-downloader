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

  it("downloads the default video and audio and shows the result in the modal", async () => {
    render(<App />);
    await getFormats();
    expect(screen.getByRole("radio", { name: /1080p 60fps/ })).toBeChecked();
    await userEvent.click(screen.getByRole("tab", { name: /Audio/ }));
    expect(screen.getByRole("radio", { name: /130 kbps/ })).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "Convert to MP3" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Download complete" })).toBeInTheDocument();
    expect(mocks.downloadMedia).toHaveBeenCalledWith(expect.objectContaining({
      format: expect.objectContaining({ format_id: "137" }),
      audio: expect.objectContaining({ format_id: "140" }),
    }));

    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers MP3 conversion for audio-only formats and passes the options", async () => {
    render(<App />);
    await getFormats();
    await userEvent.click(screen.getByRole("radio", { name: /No video/ }));
    await userEvent.click(screen.getByRole("tab", { name: /Audio/ }));
    await userEvent.click(screen.getByRole("radio", { name: /130 kbps/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Convert to MP3" }));
    await userEvent.selectOptions(screen.getByRole("combobox"), "128");
    await userEvent.click(screen.getByText("MP3 metadata"));
    await userEvent.type(screen.getByLabelText("Artist"), "jawed");
    await userEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(mocks.downloadMedia).toHaveBeenCalledWith(expect.objectContaining({
      format: expect.objectContaining({ format_id: "140" }),
      mp3: { bitrate: 128, metadata: expect.objectContaining({ artist: "jawed" }) },
    }));
  });

  it("replaces the source card with the format card, keeping the proxy editable", async () => {
    render(<App />);
    await getFormats();
    expect(screen.queryByLabelText("Video URL")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get formats" })).not.toBeInTheDocument();

    const proxy = screen.getByLabelText("Proxy");
    await userEvent.clear(proxy);
    await userEvent.type(proxy, "http://localhost:8787");
    expect(mocks.syncProxy).toHaveBeenLastCalledWith("http://localhost:8787");
    expect(localStorage.getItem("proxy")).toBe("http://localhost:8787");
  });

  it("summarises what will be saved", async () => {
    render(<App />);
    await getFormats();
    expect(screen.getByText(/Will save/).parentElement).toHaveTextContent("1080p 60fps mp4 + 130 kbps m4a → .mp4");
    await userEvent.click(screen.getByRole("tab", { name: /Audio/ }));
    await userEvent.click(screen.getByRole("radio", { name: /No audio/ }));
    expect(screen.getByText(/Will save/).parentElement).toHaveTextContent("1080p 60fps mp4 (no sound) → .mp4");
  });

  it("goes back to the source card with Change URL and the browser Back button", async () => {
    render(<App />);
    await getFormats();
    await userEvent.click(screen.getByRole("button", { name: "Change URL" }));
    expect(await screen.findByLabelText("Video URL")).toHaveValue(VIDEO);

    await userEvent.click(screen.getByRole("button", { name: "Get formats" }));
    await screen.findByRole("heading", { name: "Me at the zoo" });
    history.back();
    expect(await screen.findByLabelText("Video URL")).toBeInTheDocument();
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
