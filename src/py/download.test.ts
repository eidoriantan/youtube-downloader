import type { PyodideAPI } from "pyodide";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadTestPyodide, pyJson } from "../test/python";
import downloadPy from "./download.py?raw";

let py: PyodideAPI;
const report = vi.fn();

beforeAll(async () => {
  py = await loadTestPyodide();
});
beforeEach(() => {
  report.mockReset();
  py.runPython(`
import yt_dlp
yt_dlp.reset()
yt_dlp.INFO = {"id": "jNQXAC9IVRw"}
yt_dlp.FILES["137"] = ("mp4", b"video-bytes")
yt_dlp.FILES["140"] = ("m4a", b"audio")
`);
});

/** Runs download.py like the worker does and returns the files left in /mnt/dl. */
async function download(formatIds: string[], url = "https://www.youtube.com/watch?v=jNQXAC9IVRw") {
  py.globals.set("TARGET_URL", url);
  py.globals.set("FORMAT_IDS", py.toPy(formatIds));
  py.globals.set("REPORT_PROGRESS", report);
  await py.runPythonAsync(downloadPy);
  return Object.fromEntries(
    py.FS.readdir("/mnt/dl").filter((n: string) => n !== "." && n !== "..")
      .map((n: string) => [n, new TextDecoder().decode(py.FS.readFile(`/mnt/dl/${n}`))]),
  );
}

describe("download.py", () => {
  it("downloads each format separately to <id>.f<format_id>.<ext>", async () => {
    expect(await download(["137", "140"])).toEqual({
      "jNQXAC9IVRw.f137.mp4": "video-bytes",
      "jNQXAC9IVRw.f140.m4a": "audio",
    });
    const calls = await pyJson<[string, string, string][]>(py, "import yt_dlp\n[c[1:] for c in yt_dlp.CALLS]");
    expect(calls).toEqual([
      ["download", "https://www.youtube.com/watch?v=jNQXAC9IVRw", "137"],
      ["download", "https://www.youtube.com/watch?v=jNQXAC9IVRw", "140"],
    ]);
  });

  it("never asks yt-dlp to merge or post-process (ffmpeg.wasm does that)", async () => {
    await download(["137"]);
    const [[opts]] = await pyJson<[Record<string, unknown>][]>(py, "import yt_dlp\n[[{k: v for k, v in c[0].items() if k != 'progress_hooks'}] for c in yt_dlp.CALLS]");
    expect(opts).toEqual({
      outtmpl: "/mnt/dl/%(id)s.f%(format_id)s.%(ext)s",
      format: "137",
      quiet: true,
      noprogress: true,
      postprocessors: [],
    });
  });

  it("starts from an empty folder every time", async () => {
    await download(["137", "140"]);
    expect(Object.keys(await download(["140"]))).toEqual(["jNQXAC9IVRw.f140.m4a"]);
  });

  it("reports progress per format index, using the estimate when the total is unknown", async () => {
    py.runPython(`
import yt_dlp
yt_dlp.PROGRESS.extend([
    {"downloaded_bytes": 10, "total_bytes": 100},
    {"downloaded_bytes": 20, "total_bytes_estimate": 200.7},
    {"downloaded_bytes": None},
])`);
    await download(["137", "140"]);
    expect(report.mock.calls).toEqual([
      [0, 10, 100, false], [0, 20, 200, false], [0, 0, 0, false], [0, 11, 11, true],
      [1, 10, 100, false], [1, 20, 200, false], [1, 0, 0, false], [1, 5, 5, true],
    ]);
  });

  it("ignores hook statuses other than downloading and finished", async () => {
    py.runPython(`
import yt_dlp
yt_dlp.PROGRESS.append({"status": "error"})`);
    await download(["140"]);
    expect(report.mock.calls).toEqual([[0, 5, 5, true]]);
  });

  it("lets yt-dlp errors propagate", async () => {
    py.runPython("import yt_dlp\nyt_dlp.ERROR = yt_dlp.utils.DownloadError('ERROR: HTTP Error 403: Forbidden')");
    await expect(download(["137"])).rejects.toThrow(/HTTP Error 403: Forbidden/);
  });
});
