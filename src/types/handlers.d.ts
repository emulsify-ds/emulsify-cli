/**
 * Module that exports types pertaining to command handlers.
 */
declare module '@emulsify-cli/handlers' {
  export type InitHandlerOptions = {
    /** Git repository of the Emulsify starter to clone. */
    starter?: string | void;
    /** Commit, branch, or tag to checkout after cloning the starter repository. */
    checkout?: string | void;
    /** Platform name to use when platform auto-detection is unavailable or should be overridden. */
    platform?: string | void;
    /** Machine-friendly project folder/config name. */
    machineName?: string | void;
    /** Accept default values for missing init options without prompting. */
    yes?: boolean;
  };

  export type InstallSystemHandlerOptions = {
    repository?: string | void;
    checkout?: string | void;
    variant?: string | void;
    all?: boolean;
  };

  export type InstallComponentHandlerOptions = {
    force?: boolean;
    all?: boolean;
  };

  export type CreateComponentHandlerOptions = {
    /** Variant structure directory name where the new component should be created. */
    directory?: string;
    /** Component format to generate. Supported values are "default" and "sdc". */
    format?: string;
    /** Skip overwrite confirmation prompts and replace existing components. */
    yes?: boolean;
    /** Preview planned component operations without writing, copying, or removing files. */
    dryRun?: boolean;
  };
}
