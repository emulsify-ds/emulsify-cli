/**
 * @file Unit tests for component template override resolution.
 */

jest.mock('../../lib/log.js');

import { promises as fs } from 'fs';
import { pathExists } from 'fs-extra';
import log from '../../lib/log.js';
import resolveComponentTemplate from './resolveComponentTemplate.js';
import type { ComponentTemplateVars } from './renderTemplate.js';

const pathExistsMock = pathExists as jest.Mock;
const readFileMock = fs.readFile as jest.Mock;

const vars: ComponentTemplateVars = {
  filename: 'featured-item',
  className: 'featured-item',
  camelName: 'featuredItem',
  snakeName: 'featured_item',
  humanName: 'Featured Item',
  directory: 'base',
  format: 'default',
};

describe('resolveComponentTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when an override file is absent', async () => {
    expect.assertions(2);
    pathExistsMock.mockResolvedValueOnce(false);

    await expect(
      resolveComponentTemplate('/project', 'default', 'component.twig', vars),
    ).resolves.toBeNull();

    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('renders an override when a matching file exists', async () => {
    expect.assertions(2);
    pathExistsMock.mockResolvedValueOnce(true);
    readFileMock.mockResolvedValueOnce('<h2>{{ humanName }}</h2>');

    await expect(
      resolveComponentTemplate('/project', 'default', 'component.twig', vars),
    ).resolves.toBe('<h2>Featured Item</h2>');

    expect(readFileMock).toHaveBeenCalledWith(
      '/project/.cli/templates/default/component.twig',
      'utf8',
    );
  });

  it('falls back and warns when an override file is empty', async () => {
    expect.assertions(3);
    pathExistsMock.mockResolvedValueOnce(true);
    readFileMock.mockResolvedValueOnce('  \n');

    await expect(
      resolveComponentTemplate('/project', 'default', 'component.twig', vars),
    ).resolves.toBeNull();

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'warn',
      'Component template override "/project/.cli/templates/default/component.twig" is empty; using the built-in template instead.',
    );
  });
});
