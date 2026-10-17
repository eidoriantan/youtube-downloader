import type { PyodideAPI } from "pyodide";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadTestPyodide, pyJson } from "../test/python";
import listPy from "./list_formats.py?raw";

let py: PyodideAPI;
beforeAll(async () => {
  py = await loadTestPyodide();
});
beforeEach(() => {
  py.runPython("import yt_dlp; yt_dlp.reset()");
});

/** Gives the stub yt-dlp an info dict and runs list_formats.py like the worker does. */
async function listFormats(info: object, url = "https://www.youtube.com/watch?v=jNQXAC9IVRw") {
  py.globals.set("_INFO_JSON", JSON.stringify(info));
  py.runPython("import json, yt_dlp; yt_dlp.INFO = json.loads(_INFO_JSON)");
  py.globals.set("TARGET_URL", url);
  return JSON.parse((await py.runPythonAsync(listPy)) as string);
}

describe("list_formats.py", () => {
  it("extracts info without downloading, quietly", async () => {
    await listFormats({ id: "x", title: "t", formats: [] }, "https://youtu.be/x");
    const [opts, method, url, download] = await pyJson<[Record<string, unknown>, string, string, boolean]>(
      py, "import yt_dlp\nyt_dlp.CALLS[0]",
    );
    expect(method).toBe("extract_info");
    expect(url).toBe("https://youtu.be/x");
    expect(download).toBe(false);
    expect(opts).toMatchObject({ quiet: true, skip_download: true, noprogress: true });
  });

  it("returns the id, title and the format fields the UI uses", async () => {
    const result = await listFormats({
      id: "jNQXAC9IVRw",
      title: "Me at the zoo",
      description: "not needed",
      formats: [{
        format_id: "18", ext: "mp4", resolution: "640x360", height: 360, fps: 30, vcodec: "avc1", acodec: "mp4a",
        filesize: 1, filesize_approx: 2, tbr: 3, abr: 4, format_note: "360p", protocol: "https",
        url: "https://secret.googlevideo.com/...", http_headers: { a: "b" },
      }],
    });
    expect(result).toEqual({
      id: "jNQXAC9IVRw",
      title: "Me at the zoo",
      formats: [{
        format_id: "18", ext: "mp4", resolution: "640x360", height: 360, fps: 30, vcodec: "avc1", acodec: "mp4a",
        filesize: 1, filesize_approx: 2, tbr: 3, abr: 4, format_note: "360p", protocol: "https",
      }],
    });
  });

  it("fills missing fields with null", async () => {
    const result = await listFormats({ id: "x", title: "t", formats: [{ format_id: "140", ext: "m4a", acodec: "mp4a" }] });
    expect(result.formats[0]).toMatchObject({ format_id: "140", vcodec: null, height: null, filesize: null });
  });

  it("drops storyboards (mhtml) and formats with neither audio nor video", async () => {
    const result = await listFormats({
      id: "x",
      title: "t",
      formats: [
        { format_id: "sb0", ext: "mhtml", vcodec: "none", acodec: "none" },
        { format_id: "sb1", ext: "mhtml" },
        { format_id: "junk", ext: "mp4", vcodec: "none", acodec: "none" },
        { format_id: "140", ext: "m4a", vcodec: "none", acodec: "mp4a" },
        { format_id: "137", ext: "mp4", vcodec: "avc1", acodec: "none" },
      ],
    });
    expect(result.formats.map((f: { format_id: string }) => f.format_id)).toEqual(["140", "137"]);
  });

  it("copes with an info dict that has no formats", async () => {
    expect(await listFormats({ id: "x", title: "t" })).toEqual({ id: "x", title: "t", formats: [] });
  });

  it("lets yt-dlp errors propagate to the caller", async () => {
    py.runPython("import yt_dlp\nyt_dlp.ERROR = yt_dlp.utils.DownloadError('ERROR: [youtube] x: Video unavailable')");
    py.globals.set("TARGET_URL", "u");
    await expect(py.runPythonAsync(listPy)).rejects.toThrow(/DownloadError: ERROR: \[youtube\] x: Video unavailable/);
  });
});
