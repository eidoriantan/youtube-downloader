import type { FingerprintRequest, FingerprintResponse } from "./fingerprint.worker";

/** Like fpcalc, only the first two minutes are fingerprinted. */
const MAX_SECONDS = 120;

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, (res: FingerprintResponse) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./fingerprint.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FingerprintResponse>) => {
      pending.get(event.data.id)?.(event.data);
      pending.delete(event.data.id);
    };
    worker.onerror = (event) => {
      const error = event.message || "Fingerprint worker failed";
      for (const [id, settle] of pending) settle({ id, ok: false, error });
      pending.clear();
    };
  }
  return worker;
}

/** Fingerprints mono 16-bit PCM in a Web Worker. The samples are transferred, not copied. */
export function fingerprintPcm(sampleRate: number, samples: Int16Array): Promise<string> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, (res) => (res.ok ? resolve(res.fingerprint) : reject(new Error(res.error))));
    getWorker().postMessage({ id, sampleRate, samples } satisfies FingerprintRequest, [samples.buffer]);
  });
}

/** Decodes the start of an audio file and returns its Chromaprint fingerprint and full duration for AcoustID. */
export async function fingerprintAudio(data: Uint8Array): Promise<{ fingerprint: string; duration: number }> {
  // mediabunny is large, so it's only loaded once something needs fingerprinting.
  const { decodeAudio } = await import("./audio");
  const { samples, sampleRate, duration } = await decodeAudio(data, MAX_SECONDS);
  return { fingerprint: await fingerprintPcm(sampleRate, samples), duration };
}
