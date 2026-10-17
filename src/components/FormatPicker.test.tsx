import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ALL_FORMATS } from "../test/fixtures";
import { FormatPicker } from "./FormatPicker";

describe("FormatPicker", () => {
  it("shows formats grouped by kind with quality, container and size", () => {
    render(<FormatPicker formats={ALL_FORMATS} value="" onChange={() => {}} />);
    const groups = screen.getAllByRole("group");
    expect(groups.map((g) => g.querySelector("legend")?.textContent)).toEqual([
      "Video and audio", "Video onlyAudio is added automatically", "Audio only",
    ]);
    const video = within(groups[1]).getAllByRole("radio").map((r) => r.closest("label")?.textContent);
    expect(video).toEqual(["1080p 60fps mp450.0 MB", "1280x720 webmsize unknown"]);
  });

  it("checks the selected format and reports changes", async () => {
    const onChange = vi.fn();
    render(<FormatPicker formats={ALL_FORMATS} value="18" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: /640x360/ })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: /130 kbps/ }));
    expect(onChange).toHaveBeenCalledWith("140");
  });
});
