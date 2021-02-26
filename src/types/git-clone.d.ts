/**
 * Module containing types for the git-clone npm module.
 */

declare module 'git-clone' {
  export type GitCloneOptions = {
    git?: string;
    shallow?: boolean;
    checkout?: string | void;
  };

  export default function clone(
    repo: string,
    targetPath: string,
    options: GitCloneOptions | void,
    callback: (error?: Error | void) => void
  ): void;
}
