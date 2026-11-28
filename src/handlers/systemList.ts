import { note } from '../lib/session.js';
import getAvailableSystems from '../util/system/getAvailableSystems.js';

type AvailableSystem = {
  name: string;
  repository: string;
};

/**
 * Render the built-in systems as an aligned block.
 *
 * @param systems systems available for installation.
 * @returns a multi-line block with one system per line.
 */
export function formatSystemList(systems: AvailableSystem[]): string {
  if (systems.length === 0) {
    return 'No built-in systems are available.';
  }

  const nameWidth = Math.max(...systems.map(({ name }) => name.length));

  return systems
    .map(({ name, repository }) => `${name.padEnd(nameWidth)}  ${repository}`)
    .join('\n');
}

/**
 * Handler for the `system list` command.
 *
 * @returns a short summary of how many systems are available.
 */
export default async function systemList(): Promise<string> {
  const systems = await getAvailableSystems();

  note(formatSystemList(systems), 'Built-in systems');

  return `${systems.length} system${systems.length === 1 ? '' : 's'}  ·  install one with emulsify system install`;
}
