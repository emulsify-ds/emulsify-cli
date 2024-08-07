/**
 * Module that exports types for Emulsify's configuration files, such as system.json or variant.json.
 */
declare module '@emulsify-cli/config' {
  export * from 'src/types/_variant';
  export { EmulsifySystem } from 'src/types/_system';
  export { EmulsifyProjectConfiguration } from 'src/types/_emulsifyProjectConfig';
}
