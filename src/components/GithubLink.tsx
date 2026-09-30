import { GithubIcon } from "./icons";

export const REPO_URL = "https://github.com/eidoriantan/youtube-downloader";

export function GithubLink() {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
    >
      <GithubIcon className="h-4 w-4" />
      <span>
        <span className="font-medium">Open source</span>
      </span>
    </a>
  );
}
