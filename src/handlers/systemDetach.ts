import type { DetachSystemHandlerOptions } from '@emulsify-cli/handlers';

import { confirm } from '@inquirer/prompts';

import CliError from '../lib/CliError.js';
import log from '../lib/log.js';
import getGitRepoNameFromUrl from '../util/getGitRepoNameFromUrl.js';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig.js';
import unsetEmulsifyConfig from '../util/project/unsetEmulsifyConfig.js';
import { runPrompt } from '../util/prompt/index.js';

const CONFIGURED_SYSTEM_LABEL = 'configured component system';

function getSystemLabel(repository: string): string {
  try {
    const name = getGitRepoNameFromUrl(repository);
    return name ? `${name} system` : CONFIGURED_SYSTEM_LABEL;
  } catch {
    return CONFIGURED_SYSTEM_LABEL;
  }
}

/**
 * Detach the configured component system without changing component files.
 */
export default async function systemDetach({
  yes = false,
}: DetachSystemHandlerOptions = {}): Promise<void> {
  const projectConfig = await getEmulsifyConfig();
  if (!projectConfig) {
    throw new CliError(
      'No Emulsify project detected. Run this command within an existing Emulsify project.',
    );
  }

  if (!projectConfig.system) {
    throw new CliError(
      'No component system is configured for this Emulsify project.',
    );
  }

  const systemLabel = getSystemLabel(projectConfig.system.repository);
  const systemReference = `${systemLabel} at ${projectConfig.system.checkout}`;
  const confirmed = await runPrompt({
    prompt: () =>
      confirm({
        message: `Detach the ${systemReference} from this project? Component files will be left in place.`,
        default: false,
      }),
    nonInteractive: {
      error:
        'System detachment requires confirmation in non-interactive mode. Pass --yes to detach the configured system.',
    },
    accept: { when: yes, value: true },
  });

  if (!confirmed) {
    log('info', 'System detach cancelled. No project files were changed.');
    return;
  }

  try {
    await unsetEmulsifyConfig('system', 'variant');
  } catch {
    throw new CliError(
      'Unable to detach the configured system from project.emulsify.json.',
    );
  }

  log(
    'success',
    `Detached the ${systemReference}. All component files were left in place.`,
  );
  log(
    'info',
    'Next: run "emulsify system create" to scaffold your own system repository, then replace its example content with the components preserved in this project.',
  );
}
