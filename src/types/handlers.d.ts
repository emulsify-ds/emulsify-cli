/**
 * Module that exports types pertaining to command handlers.
 */
declare module '@emulsify-cli/handlers' {
  export type InitHandlerOptions = {
    starter?: string | void;
    checkout?: string | void;
    platform?: string | void;
    machineName?: string | void;
  };

  export type InstallSystemHandlerOptions = {
    repository?: string | void;
    checkout?: string | void;
    variant?: string | void;
  };

  export type InstallComponentHandlerOptions = {
    force?: boolean;
    all?: boolean;
  };
}
