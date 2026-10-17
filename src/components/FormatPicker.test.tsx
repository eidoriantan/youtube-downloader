import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ALL_FORMATS, FORMATS } from "../test/fixtures";
import { FormatPicker } from "./FormatPicker";

function setup(videoId = "137", audioId = "140", formats = ALL_FORMATS) {
  const onVideoChange = vi.fn();
  const onAudioChange = vi.fn();
  render(
    <FormatPicker
      formats={formats}
      videoId={videoId}
      audioId={audioId}
      onVideoChange={onVideoChange}
      onAudioChange={onAudioChange}
    />,
  );
  const labels = () => screen.getAllByRole("radio").map((r) => r.closest("label")?.textContent);
  return { onVideoChange, onAudioChange, labels };
}

describe("FormatPicker", () => {
  it("lists video-only streams with quality, container and size, best first, plus a none option", () => {
    const { labels } = setup();
    expect(screen.getByRole("tab", { name: /Video/ })).toHaveAttribute("aria-selected", "true");
    expect(labels()).toEqual(["1080p 60fps mp450.0 MB", "1280x720 webmsize unknown", "No video, audio only"]);
  });

  it("lists audio-only streams, highest bitrate first, on the Audio tab", async () => {
    const { labels } = setup();
    await userEvent.click(screen.getByRole("tab", { name: /Audio/ }));
    expect(labels()).toEqual(["135 kbps webm3.1 MB", "130 kbps m4a2.9 MB", "64 kbps webmsize unknown", "No audio, silent video"]);
  });

  it("shows each tab's selection as a badge", () => {
    setup("137", "");
    expect(screen.getByRole("tab", { name: /Video/ })).toHaveTextContent("1080p");
    expect(screen.getByRole("tab", { name: /Audio/ })).toHaveTextContent("none");
  });

  it("checks the selected format and reports changes", async () => {
    const { onAudioChange } = setup("137", "251");
    await userEvent.click(screen.getByRole("tab", { name: /Audio/ }));
    expect(screen.getByRole("radio", { name: /135 kbps/ })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: /130 kbps/ }));
    expect(onAudioChange).toHaveBeenCalledWith(FORMATS.m4a.format_id);
  });

  it("opens the Audio tab after a video is picked", async () => {
    const { onVideoChange } = setup("", "140");
    await userEvent.click(screen.getByRole("radio", { name: /1280x720/ }));
    expect(onVideoChange).toHaveBeenCalledWith("247");
    expect(screen.getByRole("tab", { name: /Audio/ })).toHaveAttribute("aria-selected", "true");
  });

  it("opens the Audio tab after choosing no video", async () => {
    const { onVideoChange } = setup();
    await userEvent.click(screen.getByRole("radio", { name: /No video/ }));
    expect(onVideoChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("tab", { name: /Audio/ })).toHaveAttribute("aria-selected", "true");
  });

  it("clears the audio with the none option and stays on the Audio tab", async () => {
    const { onAudioChange } = setup();
    await userEvent.click(screen.getByRole("tab", { name: /Audio/ }));
    await userEvent.click(screen.getByRole("radio", { name: /No audio/ }));
    expect(onAudioChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("tab", { name: /Audio/ })).toHaveAttribute("aria-selected", "true");
  });

  it("anchors each hidden radio to its option so focusing it can't scroll the page away", () => {
    setup();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveClass("sr-only");
      expect(radio.closest("label")).toHaveClass("relative");
    }
  });

  it("switches tabs with the arrow keys", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: /Video/ }));
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Audio/ })).toHaveFocus();
    expect(screen.getByRole("tab", { name: /Audio/ })).toHaveAttribute("aria-selected", "true");
  });

  it("starts on the Audio tab when there are no video-only streams", () => {
    setup("", "140", [FORMATS.mp4_360, FORMATS.m4a]);
    expect(screen.getByRole("tab", { name: /Audio/ })).toHaveAttribute("aria-selected", "true");
  });
});
