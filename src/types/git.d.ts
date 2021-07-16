/**
 * Module that exports types pertaining to git operations.
 */
declare module '@emulsify-cli/git' {
  export type GitCloneOptions = {
    /**
     * Absolute path to the directory that the repository should be cloned into. Optional,
     * defaulting behavior should be handled on a case-by-case basis.
     */
    target?: string | void;
    /**
     * Path to git repository that should be cloned.
     */
    repository: string;
    /**
     * Git revision/branch/tag that should be checked out.
     */
    checkout?: string | void;
  };
}
