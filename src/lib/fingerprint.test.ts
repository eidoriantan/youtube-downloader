import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FingerprintRequest, FingerprintResponse } from "./fingerprint.worker";

const decodeAudio = vi.hoisted(() => vi.fn());
vi.mock("./audio", () => ({ decodeAudio }));

class StubWorker {
  static last: StubWorker;
  posted: { msg: FingerprintRequest; transfer: Transferable[] }[] = [];
  onmessage: ((e: MessageEvent<FingerprintResponse>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  url: URL;
  options: WorkerOptions;
  constructor(url: URL, options: WorkerOptions) {
    this.url = url;
    this.options = options;
    StubWorker.last = this;
  }
  postMessage(msg: FingerprintRequest, transfer: Transferable[]) {
    this.posted.push({ msg, transfer });
  }
  reply(res: FingerprintResponse) {
    this.onmessage?.({ data: res } as MessageEvent<FingerprintResponse>);
  }
}

let mod: typeof import("./fingerprint");

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("Worker", StubWorker);
  mod = await import("./fingerprint");
});

describe("fingerprintPcm", () => {
  it("transfers the samples to a module worker and resolves with its fingerprint", async () => {
    const samples = new Int16Array([1, 2, 3]);
    const result = mod.fingerprintPcm(44100, samples);
    const worker = StubWorker.last;
    expect(worker.options).toEqual({ type: "module" });
    expect(String(worker.url)).toMatch(/fingerprint\.worker\.ts/);
    const [{ msg, transfer }] = worker.posted;
    expect(msg).toEqual({ id: 0, sampleRate: 44100, samples });
    expect(transfer).toEqual([samples.buffer]);

    worker.reply({ id: 0, ok: true, fingerprint: "AQAB" });
    await expect(result).resolves.toBe("AQAB");
  });

  it("rejects with the worker's error, and fails pending calls if the worker crashes", async () => {
    const first = mod.fingerprintPcm(44100, new Int16Array(1));
    StubWorker.last.reply({ id: 0, ok: false, error: "unreachable" });
    await expect(first).rejects.toThrow("unreachable");

    const second = mod.fingerprintPcm(44100, new Int16Array(1));
    StubWorker.last.onerror?.({ message: "" } as ErrorEvent);
    await expect(second).rejects.toThrow("Fingerprint worker failed");
  });
});

describe("fingerprintAudio", () => {
  it("fingerprints the first two minutes and passes the full duration through", async () => {
    const samples = new Int16Array([5]);
    decodeAudio.mockResolvedValue({ samples, sampleRate: 48000, duration: 212.5 });
    const result = mod.fingerprintAudio(new Uint8Array([9]));
    await vi.waitFor(() => expect(StubWorker.last?.posted).toHaveLength(1));
    expect(decodeAudio).toHaveBeenCalledWith(new Uint8Array([9]), 120);
    expect(StubWorker.last.posted[0].msg).toMatchObject({ sampleRate: 48000, samples });

    StubWorker.last.reply({ id: 0, ok: true, fingerprint: "AQAB" });
    await expect(result).resolves.toEqual({ fingerprint: "AQAB", duration: 212.5 });
  });
});
