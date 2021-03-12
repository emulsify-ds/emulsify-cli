/**
 * Module that exports types pertaining to command handlers.
 */
declare module '@emulsify-cli/handlers' {
  export type InitHandlerOptions = {
    starter?: string | void;
    checkout?: string | void;
  };

  export type InstallSystemHandlerOptions = {
    repository?: string;
    checkout?: string;
    variant?: string;
  };
}
