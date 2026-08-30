/**
 * @file Unit tests for component template override resolution.
 */

jest.mock('../../lib/log.js');

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { pathExists } from 'fs-extra';
import log from '../../lib/log.js';
import { EMULSIFY_PROJECT_TEMPLATES_FOLDER } from '../../lib/constants.js';
import resolveComponentTemplate from './resolveComponentTemplate.js';
import type { ComponentTemplateVars } from './renderTemplate.js';

const pathExistsMock = pathExists as jest.Mock;
const readFileMock = fs.readFile as jest.Mock;
const projectRoot = resolve('/project');
const templatesRoot = join(projectRoot, EMULSIFY_PROJECT_TEMPLATES_FOLDER);
const twigTemplatePath = join(templatesRoot, 'twig', 'component.twig');
const legacyTwigTemplatePath = join(templatesRoot, 'default', 'component.twig');
const twigSdcTemplatePath = join(templatesRoot, 'twig-sdc', 'component.twig');
const legacyTwigSdcTemplatePath = join(templatesRoot, 'sdc', 'component.twig');
const reactTemplatePath = join(templatesRoot, 'react', 'component.jsx');

const vars: ComponentTemplateVars = {
  filename: 'featured-item',
  className: 'featured-item',
  camelName: 'featuredItem',
  pascalName: 'FeaturedItem',
  snakeName: 'featured_item',
  humanName: 'Featured Item',
  directory: 'base',
  format: 'default',
  type: 'twig',
  tagName: '',
};

describe('resolveComponentTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pathExistsMock.mockReset();
    readFileMock.mockReset();
  });

  it('checks the canonical Twig directory before its legacy alias', async () => {
    expect.assertions(4);
    pathExistsMock.mockResolvedValue(false);

    await expect(
      resolveComponentTemplate(projectRoot, 'twig', 'component.twig', vars),
    ).resolves.toBeNull();

    expect(pathExistsMock).toHaveBeenCalledTimes(2);
    expect(pathExistsMock).toHaveBeenNthCalledWith(1, twigTemplatePath);
    expect(pathExistsMock).toHaveBeenNthCalledWith(2, legacyTwigTemplatePath);
  });

  it('uses the canonical override without consulting the legacy alias', async () => {
    expect.assertions(4);
    pathExistsMock.mockResolvedValueOnce(true);
    readFileMock.mockResolvedValueOnce('<h2>{{ humanName }}</h2>');

    await expect(
      resolveComponentTemplate(projectRoot, 'twig', 'component.twig', vars),
    ).resolves.toBe('<h2>Featured Item</h2>');

    expect(pathExistsMock).toHaveBeenCalledTimes(1);
    expect(pathExistsMock).toHaveBeenCalledWith(twigTemplatePath);
    expect(readFileMock).toHaveBeenCalledWith(twigTemplatePath, 'utf8');
  });

  it('falls back from twig to the legacy default directory', async () => {
    expect.assertions(4);
    pathExistsMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    readFileMock.mockResolvedValueOnce('<h2>{{ humanName }}</h2>');

    await expect(
      resolveComponentTemplate(projectRoot, 'twig', 'component.twig', vars),
    ).resolves.toBe('<h2>Featured Item</h2>');

    expect(pathExistsMock).toHaveBeenCalledTimes(2);
    expect(pathExistsMock).toHaveBeenNthCalledWith(1, twigTemplatePath);
    expect(readFileMock).toHaveBeenCalledWith(legacyTwigTemplatePath, 'utf8');
  });

  it('falls back from twig-sdc to the legacy sdc directory', async () => {
    expect.assertions(4);
    pathExistsMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    readFileMock.mockResolvedValueOnce('{{ type }}: {{ pascalName }}');

    await expect(
      resolveComponentTemplate(projectRoot, 'twig-sdc', 'component.twig', {
        ...vars,
        format: 'sdc',
        type: 'twig-sdc',
      }),
    ).resolves.toBe('twig-sdc: FeaturedItem');

    expect(pathExistsMock).toHaveBeenCalledTimes(2);
    expect(pathExistsMock).toHaveBeenNthCalledWith(1, twigSdcTemplatePath);
    expect(readFileMock).toHaveBeenCalledWith(
      legacyTwigSdcTemplatePath,
      'utf8',
    );
  });

  it('does not fall through to a legacy alias when the canonical override is empty', async () => {
    expect.assertions(5);
    pathExistsMock.mockResolvedValueOnce(true);
    readFileMock.mockResolvedValueOnce('  \n');

    await expect(
      resolveComponentTemplate(projectRoot, 'twig', 'component.twig', vars),
    ).resolves.toBeNull();

    expect(pathExistsMock).toHaveBeenCalledTimes(1);
    expect(readFileMock).toHaveBeenCalledWith(twigTemplatePath, 'utf8');
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'warn',
      `Component template override "${twigTemplatePath}" is empty; using the built-in template instead.`,
    );
  });

  it('checks only the canonical directory for a type without a legacy alias', async () => {
    expect.assertions(4);
    pathExistsMock.mockResolvedValueOnce(false);

    await expect(
      resolveComponentTemplate(projectRoot, 'react', 'component.jsx', {
        ...vars,
        type: 'react',
      }),
    ).resolves.toBeNull();

    expect(pathExistsMock).toHaveBeenCalledTimes(1);
    expect(pathExistsMock).toHaveBeenCalledWith(reactTemplatePath);
    expect(readFileMock).not.toHaveBeenCalled();
  });
});
