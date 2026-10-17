import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_METADATA } from "../test/fixtures";
import type { Mp3Bitrate, Mp3Metadata } from "../types";
import { Mp3Options } from "./Mp3Options";

const changes = { enabled: vi.fn(), bitrate: vi.fn(), autoTag: vi.fn(), metadata: vi.fn() };

function Harness({ initiallyEnabled = false, initialAutoTag = false }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [autoTag, setAutoTag] = useState(initialAutoTag);
  const [bitrate, setBitrate] = useState<Mp3Bitrate>(320);
  const [metadata, setMetadata] = useState<Mp3Metadata>(EMPTY_METADATA);
  return (
    <Mp3Options
      enabled={enabled}
      onEnabledChange={(v) => { changes.enabled(v); setEnabled(v); }}
      bitrate={bitrate}
      onBitrateChange={(v) => { changes.bitrate(v); setBitrate(v); }}
      autoTag={autoTag}
      onAutoTagChange={(v) => { changes.autoTag(v); setAutoTag(v); }}
      metadata={metadata}
      onMetadataChange={(v) => { changes.metadata(v); setMetadata(v); }}
    />
  );
}

beforeEach(() => {
  Object.values(changes).forEach((m) => m.mockReset());
  URL.createObjectURL = vi.fn(() => "blob:cover");
  URL.revokeObjectURL = vi.fn();
});

describe("Mp3Options", () => {
  it("hides bitrate and metadata until MP3 is enabled", async () => {
    render(<Harness />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Convert to MP3" }));
    expect(changes.enabled).toHaveBeenCalledWith(true);
    expect(screen.getByRole("combobox")).toHaveValue("320");
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });

  it("hides the metadata form while MusicBrainz prefill is on", async () => {
    render(<Harness initiallyEnabled initialAutoTag />);
    const toggle = screen.getByRole("checkbox", { name: /Prefill metadata from MusicBrainz/ });
    expect(toggle).toBeChecked();
    expect(screen.queryByText("MP3 metadata")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(changes.autoTag).toHaveBeenCalledWith(false);
    expect(screen.getByText("MP3 metadata")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });

  it("only offers the prefill toggle once MP3 is enabled", async () => {
    render(<Harness initialAutoTag />);
    expect(screen.queryByRole("checkbox", { name: /Prefill metadata/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Convert to MP3" }));
    expect(screen.getByRole("checkbox", { name: /Prefill metadata/ })).toBeChecked();
  });

  it("offers 128-320 kbps and reports the choice as a number", async () => {
    render(<Harness initiallyEnabled />);
    const select = screen.getByRole("combobox");
    expect([...select.querySelectorAll("option")].map((o) => o.value)).toEqual(["128", "192", "256", "320"]);
    await userEvent.selectOptions(select, "192");
    expect(changes.bitrate).toHaveBeenCalledWith(192);
  });

  it("edits each ID3 text field", async () => {
    render(<Harness initiallyEnabled />);
    for (const [label, key] of [["Title", "title"], ["Artist", "artist"], ["Album", "album"],
      ["Genre", "genre"], ["Year", "year"], ["Track #", "track"]] as const) {
      await userEvent.type(screen.getByLabelText(label), "x1");
      expect(changes.metadata).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: "x1" }));
    }
  });

  it("previews, then removes, cover art", async () => {
    render(<Harness initiallyEnabled />);
    const file = new File([new Uint8Array([1])], "cover.png", { type: "image/png" });
    const input = screen.getByLabelText<HTMLInputElement>("Cover art");
    expect(input.accept).toBe("image/jpeg,image/png");
    await userEvent.upload(input, file);
    expect(changes.metadata).toHaveBeenLastCalledWith(expect.objectContaining({ cover: file }));
    expect(screen.getByAltText("Cover art preview")).toHaveAttribute("src", "blob:cover");

    await userEvent.click(screen.getByRole("button", { name: "Remove cover art" }));
    expect(changes.metadata).toHaveBeenLastCalledWith(expect.objectContaining({ cover: null }));
    expect(screen.queryByAltText("Cover art preview")).not.toBeInTheDocument();
    expect(input.value).toBe("");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:cover");
  });
});
