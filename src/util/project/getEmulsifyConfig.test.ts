jest.mock('../fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../fs/loadJsonFile', () => jest.fn());

import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import loadJsonFile from '../fs/loadJsonFile.js';
import getEmulsifyConfig from './getEmulsifyConfig.js';

const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/projects/project.emulsify.json',
);
const loadJsonFileMock = loadJsonFile as jest.Mock;
const projectConfig = {
  project: {
    platform: 'drupal',
    name: 'Cornflake',
    machineName: 'cornflake',
  },
  starter: {
    repository: 'https://github.com/emulsify-ds/emulsify-starter',
  },
};

describe('getEmulsifyConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findFileMock.mockReturnValue('/projects/project.emulsify.json');
    loadJsonFileMock.mockResolvedValue(projectConfig);
  });

  it('can load the Emulsify configuration for the project within the users cwd', async () => {
    await expect(getEmulsifyConfig()).resolves.toEqual(projectConfig);
  });

  it('accepts wordpress as a concrete project platform', async () => {
    const wordpressProjectConfig = {
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'wordpress',
      },
    };
    loadJsonFileMock.mockResolvedValueOnce(wordpressProjectConfig);

    await expect(getEmulsifyConfig()).resolves.toEqual(wordpressProjectConfig);
  });

  it('accepts shared starter and Emulsify Core configuration fields', async () => {
    const sharedProjectConfig = {
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'drupal',
        singleDirectoryComponents: true,
        generatedFrom: 'emulsify-drupal',
        generatedFromVersion: '7.2.1',
        description: 'A generated Drupal theme.',
        assetRoots: ['./legacy-project-assets'],
      },
      projectStructure: {
        assetRoots: ['./legacy-structure-assets'],
      },
      assets: {
        roots: ['./design-system/assets'],
        rebase: false,
        selfContainedOutput: false,
      },
    };
    loadJsonFileMock.mockResolvedValueOnce(sharedProjectConfig);

    await expect(getEmulsifyConfig()).resolves.toEqual(sharedProjectConfig);
  });

  it('returns void if no Emulsify config file is found within the users cwd', async () => {
    findFileMock.mockReturnValueOnce(undefined);
    await expect(getEmulsifyConfig()).resolves.toBe(undefined);
  });

  it('handles errors thrown by findFileInCurrentPath', async () => {
    findFileMock.mockImplementationOnce(() => {
      throw new Error('findFile error');
    });
    await expect(getEmulsifyConfig()).rejects.toThrow('findFile error');
  });

  it('handles errors thrown by loadJsonFile', async () => {
    loadJsonFileMock.mockImplementationOnce(() => {
      throw new Error('loadJsonFile error');
    });
    await expect(getEmulsifyConfig()).rejects.toThrow('loadJsonFile error');
  });

  it('reports schema-invalid config missing required project settings', async () => {
    loadJsonFileMock.mockResolvedValueOnce({
      starter: {
        repository: 'https://github.com/emulsify-ds/emulsify-starter',
      },
    });

    await expect(getEmulsifyConfig()).rejects.toThrow(
      'Invalid Emulsify project configuration in "/projects/project.emulsify.json": / must have required property \'project\'',
    );
  });

  it('names every unknown project property in schema validation errors', async () => {
    loadJsonFileMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        generatedForm: 'emulsify-wordpress',
        generatedFromVerison: '2.0.0',
        descripton: 'A generated WordPress child theme.',
      },
    });

    await expect(getEmulsifyConfig()).rejects.toMatchObject({
      message:
        'Invalid Emulsify project configuration in "/projects/project.emulsify.json": /project must NOT have additional property "generatedForm"; /project must NOT have additional property "generatedFromVerison"; /project must NOT have additional property "descripton"',
    });
  });

  it('accepts variant platform compatibility expressions', async () => {
    const expressionConfig = {
      ...projectConfig,
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'main',
      },
      variant: {
        platform: 'drupal || wordpress',
        structureImplementations: [],
      },
    };
    loadJsonFileMock.mockResolvedValueOnce(expressionConfig);

    await expect(getEmulsifyConfig()).resolves.toEqual(expressionConfig);
  });

  it('reports schema-invalid project platform expressions', async () => {
    loadJsonFileMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'drupal || wordpress',
      },
    });

    await expect(getEmulsifyConfig()).rejects.toThrow(
      'Invalid Emulsify project configuration in "/projects/project.emulsify.json": /project/platform must be equal to one of the allowed values',
    );
  });

  it('reports schema-invalid variant platform expressions', async () => {
    loadJsonFileMock.mockResolvedValueOnce({
      ...projectConfig,
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'main',
      },
      variant: {
        platform: 'drupal && wordpress',
        structureImplementations: [],
      },
    });

    await expect(getEmulsifyConfig()).rejects.toThrow(
      '/variant/platform must match a schema in anyOf',
    );
  });
});
