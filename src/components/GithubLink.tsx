import { GithubIcon } from "./icons";

export const REPO_URL = "https://github.com/eidoriantan/youtube-downloader";

export function GithubLink() {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-800 bg-ink-900/60 px-3.5 py-1.5 text-sm text-ink-300 transition hover:border-ink-700 hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300"
    >
      <GithubIcon className="h-4 w-4" />
      <span>
        <span className="font-medium">Open source</span>
      </span>
    </a>
  );
}
