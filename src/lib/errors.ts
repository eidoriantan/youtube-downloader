// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;

/**
 * Reduces an error (including Pyodide's multi-line Python tracebacks) to a
 * single readable message. The full error is logged to the console.
 */
export function friendlyError(e: unknown): string {
  console.error(e);
  const raw = (e instanceof Error ? e.message : String(e)).replace(ANSI, "").trim();

  // A Python traceback ends with the actual exception on its last line.
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  let msg = raw.includes("Traceback (most recent call last)") ? lines[lines.length - 1] : raw;

  msg = msg
    .replace(/^(?:[\w]+\.)*\w*(?:Error|Exception):\s*/, "") // "yt_dlp.utils.DownloadError: "
    .replace(/^ERROR:\s*/, "")
    .trim();

  return msg || "Something went wrong.";
}
