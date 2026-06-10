/**
 * Module that exports types for Emulsify's configuration files, such as system.json or variant.json.
 */
declare module '@emulsify-cli/config' {
  export * from 'src/types/_variant.js';
  export { EmulsifySystem } from 'src/types/_system.js';
  export { EmulsifyProjectConfiguration } from 'src/types/_emulsifyProjectConfig.js';
}
