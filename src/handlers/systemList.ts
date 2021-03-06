import log from '../lib/log';
import getAvailableSystems from '../util/system/getAvailableSystems';

/**
 * Handler for the `system list` command.
 */
export default async function systemList(): Promise<void> {
  (await getAvailableSystems()).map(({ name, repository }) =>
    log('info', `${name} - ${repository}`)
  );
}
