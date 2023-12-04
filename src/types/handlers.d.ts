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
    all?: boolean;
  };

  export type InstallComponentHandlerOptions = {
    force?: boolean;
    all?: boolean;
  };

  export type CreateComponentHandlerOptions = {
    directory?: string;
  };

  export type StructureHandlerResponse = {
    structure: string;
  };
}
