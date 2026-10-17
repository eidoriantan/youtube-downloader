import type { PyRequest, PyResponse } from "../types";

/** Records what the page posts and lets a test reply as the Pyodide worker. */
export class FakeWorker {
  static instances: FakeWorker[] = [];
  static get last(): FakeWorker {
    return FakeWorker.instances[FakeWorker.instances.length - 1];
  }

  posted: PyRequest[] = [];
  terminated = false;
  onmessage: ((e: MessageEvent<PyResponse>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;

  url: URL | string;
  options?: WorkerOptions;

  constructor(url: URL | string, options?: WorkerOptions) {
    this.url = url;
    this.options = options;
    FakeWorker.instances.push(this);
  }
  postMessage(req: PyRequest) {
    this.posted.push(req);
  }
  terminate() {
    this.terminated = true;
  }
  /** Sends a message from the worker to the page. */
  reply(msg: PyResponse) {
    this.onmessage?.({ data: msg } as MessageEvent<PyResponse>);
  }
  crash(message = "") {
    this.onerror?.({ message } as ErrorEvent);
  }
  /** The last call request (anything with an id) the page sent. */
  lastCall() {
    return [...this.posted].reverse().find((r): r is Extract<PyRequest, { id: number }> => "id" in r)!;
  }
}

/** Lets pending promise callbacks run. */
export const flush = () => new Promise((r) => setTimeout(r, 0));
