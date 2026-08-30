/**
 * Module that exports types pertaining to command handlers.
 */
declare module '@emulsify-cli/handlers' {
  import type { Platform, PlatformExpression } from '@emulsify-cli/config';

  export type InitHandlerOptions = {
    /** Git repository of the Emulsify starter to clone. */
    starter?: string | void;
    /** Commit, branch, or tag to checkout after cloning the starter repository. */
    checkout?: string | void;
    /** Platform name to use when platform auto-detection is unavailable or should be overridden. */
    platform?: Platform | void;
    /** Machine-friendly project folder/config name. */
    machineName?: string | void;
    /** Accept default values for missing init options without prompting. */
    yes?: boolean;
  };

  export type InstallSystemHandlerOptions = {
    repository?: string | void;
    checkout?: string | void;
    variant?: PlatformExpression | void;
    all?: boolean;
    /** Accept the guided installation after rendering its final review. */
    yes?: boolean;
  };

  export type CreateSystemHandlerOptions = {
    /** Parent directory in which the standalone system repository is created. */
    directory?: string | void;
    /** Platform compatibility expression for the scaffold's first variant. */
    platform?: PlatformExpression | string | void;
    /** Whether to initialize the generated system as a Git repository. */
    git?: boolean;
    /** Homepage URI written to the generated system configuration. */
    homepage?: string | void;
    /** Repository URI written to the generated system configuration. */
    repository?: string | void;
    /** Accept defaults for all missing system scaffold values. */
    yes?: boolean;
  };

  export type DetachSystemHandlerOptions = {
    /** Detach the configured system without prompting for confirmation. */
    yes?: boolean;
  };

  export type ListComponentHandlerOptions = {
    /** Check the configured system's remote ref before reusing its local cache entry. */
    refresh?: boolean;
  };

  export type InstallComponentHandlerOptions = {
    force?: boolean;
    all?: boolean;
    dryRun?: boolean;
    /** Check the configured system's remote ref before reusing its local cache entry. */
    refresh?: boolean;
  };

  export type CreateComponentHandlerOptions = {
    /** Variant structure directory name where the new component should be created. */
    directory?: string;
    /** Component implementation type to generate. */
    type?: string;
    /** Deprecated component format alias. "default" maps to "twig" and "sdc" maps to "twig-sdc". */
    format?: string;
    /** Skip overwrite confirmation prompts and replace existing components. */
    yes?: boolean;
    /** Preview planned component operations without writing, copying, or removing files. */
    dryRun?: boolean;
    /** Check the configured system's remote ref before reusing its local cache entry. */
    refresh?: boolean;
  };

  export type EjectComponentTemplatesHandlerOptions = {
    /** Replace existing selected component template overrides. */
    force?: boolean;
    /** Preview component template destinations without writing files. */
    dryRun?: boolean;
  };

  export type ClearCacheHandlerOptions = {
    /** Report cache contents without removing them. */
    dryRun?: boolean;
  };
}
