/**
 * Where Desktop looks for GitHub Releases (milestone builds only).
 * Override with CARDO_UPDATE_OWNER / CARDO_UPDATE_REPO for forks.
 */
export const DEFAULT_UPDATE_GITHUB_OWNER = 'tzhaos';
export const DEFAULT_UPDATE_GITHUB_REPO = 'Cardo';

export function resolveUpdateRepository(env: NodeJS.ProcessEnv = process.env): {
  owner: string;
  repo: string;
} {
  const owner =
    (env.CARDO_UPDATE_OWNER ?? DEFAULT_UPDATE_GITHUB_OWNER).trim() || DEFAULT_UPDATE_GITHUB_OWNER;
  const repo =
    (env.CARDO_UPDATE_REPO ?? DEFAULT_UPDATE_GITHUB_REPO).trim() || DEFAULT_UPDATE_GITHUB_REPO;
  return { owner, repo };
}

export function githubReleasesApiUrl(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/releases`;
}

export function githubLatestReleaseApiUrl(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
}

export function githubReleasePageUrl(owner: string, repo: string, tag: string): string {
  return `https://github.com/${owner}/${repo}/releases/tag/${tag}`;
}
