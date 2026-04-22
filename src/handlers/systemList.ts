import log from '../lib/log.js';
import getAvailableSystems from '../util/system/getAvailableSystems.js';

/**
 * Handler for the `system list` command.
 */
export default async function systemList(): Promise<void> {
  (await getAvailableSystems()).map(({ name, repository }) =>
    log('info', `${name} - ${repository}`),
  );
}
