import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";

describe("Field", () => {
  it("links the label to the input with a derived id", () => {
    render(<Field label="Proxy URL" hint="Saved in this browser." defaultValue="x" />);
    const input = screen.getByLabelText("Proxy URL");
    expect(input).toHaveAttribute("id", "field-proxy-url");
    expect(input).toHaveValue("x");
    expect(screen.getByText("Saved in this browser.")).toBeInTheDocument();
  });

  it("uses an explicit id when given", () => {
    render(<Field label="Title" id="mp3-title" />);
    expect(screen.getByLabelText("Title")).toHaveAttribute("id", "mp3-title");
  });
});
