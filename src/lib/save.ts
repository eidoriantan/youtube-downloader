/** Triggers a browser download for in-memory bytes. */
export function saveBlob(data: Uint8Array, ext: string, isVideo: boolean, filename: string): void {
  const type = isVideo ? `video/${ext === "mkv" ? "x-matroska" : ext}` : `audio/${ext === "mp3" ? "mpeg" : ext}`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data as BlobPart], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}
