jest.mock('fs-extra', () => ({
  __esModule: true,
  default: {
    mkdir: jest.fn(),
    emptyDir: jest.fn(),
    writeFile: jest.fn(),
    copy: jest.fn(),
    remove: jest.fn(),
  },
  pathExists: jest.fn(),
  emptyDir: jest.fn(),
  remove: jest.fn(),
}));
jest.mock('@inquirer/prompts');
jest.mock('../../lib/log.js');
jest.mock('../fs/findFileInCurrentPath.js');
jest.mock('../fs/loadJsonFile.js');

import { confirm, input, select } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import { join, normalize, resolve, sep } from 'path';
import { pathExists, remove } from 'fs-extra';
import log from '../../lib/log.js';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_PROJECT_TEMPLATES_FOLDER,
} from '../../lib/constants.js';
import generateComponent from './generateComponent.js';
import type {
  EmulsifyProjectConfiguration,
  EmulsifyVariant,
} from '@emulsify-cli/config';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import loadJsonFile from '../fs/loadJsonFile.js';

const projectRoot = resolve(
  '/home/uname/Projects/cornflake/web/themes/custom/themename',
);
const projectConfigPath = join(projectRoot, EMULSIFY_PROJECT_CONFIG_FILE);
const componentStructurePath = join(projectRoot, 'components', '00-base');
const componentPath = (name: string, fileName?: string) =>
  fileName
    ? join(componentStructurePath, name, fileName)
    : join(componentStructurePath, name);
const projectTemplatePath = (format: string, fileName: string) =>
  join(projectRoot, EMULSIFY_PROJECT_TEMPLATES_FOLDER, format, fileName);
const templatePathFragment = `${sep}${normalize(
  EMULSIFY_PROJECT_TEMPLATES_FOLDER,
)}${sep}`;
const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  projectConfigPath,
);

const variant = {
  structureImplementations: [
    {
      name: 'base',
      directory: './components/00-base',
    },
  ],
  components: [
    {
      name: 'link',
      structure: 'base',
    },
  ],
} as EmulsifyVariant;

const projectConfig: EmulsifyProjectConfiguration = {
  project: {
    platform: 'drupal',
    name: 'Cornflake',
    machineName: 'cornflake',
  },
  starter: {
    repository: 'https://github.com/emulsify-ds/emulsify-starter.git',
  },
};

const pathExistsMock = (pathExists as jest.Mock).mockResolvedValue(true);
const removeMock = remove as jest.Mock;
const readFileMock = fs.readFile as jest.Mock;
const writeFileMock = fs.writeFile as jest.Mock;
const mkdirMock = fs.mkdir as jest.Mock;
const loadJsonFileMock = loadJsonFile as jest.Mock;
const inputMock = input as jest.Mock;
const selectMock = select as jest.Mock;
const confirmMock = confirm as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;

function setStdinIsTTY(value: boolean | undefined) {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

function isTemplatePath(path: unknown): boolean {
  return String(path).includes(templatePathFragment);
}

function mockTemplateOverrides(
  overrides: Record<string, string>,
  componentExists = false,
) {
  pathExistsMock.mockImplementation((path) => {
    const value = String(path);

    if (isTemplatePath(value)) {
      return Object.keys(overrides).some((templatePath) =>
        value.endsWith(normalize(templatePath)),
      );
    }

    if (value.startsWith(`${componentStructurePath}${sep}`)) {
      return componentExists;
    }

    return true;
  });
  readFileMock.mockImplementation(async (path) => {
    const value = String(path);
    const templatePath = Object.keys(overrides).find((key) =>
      value.endsWith(normalize(key)),
    );

    return templatePath ? overrides[templatePath] : '';
  });
}

describe('generateComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStdinIsTTY(true);
    pathExistsMock.mockImplementation((path) => !isTemplatePath(path));
    readFileMock.mockResolvedValue('');
    loadJsonFileMock.mockResolvedValue({
      dependencies: { '@emulsify/core': '^4.4.0' },
    });
    inputMock.mockResolvedValue('cornflake-button');
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('throws an error if the user is not within an Emulsify project', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(
      generateComponent(variant, projectConfig, 'button', { type: 'twig' }),
    ).rejects.toThrow(
      'Unable to find an Emulsify project to create the component into.',
    );
  });

  it('throws before prompts or filesystem lookup when the component name is empty after sanitizing', async () => {
    expect.assertions(4);

    await expect(
      generateComponent(variant, projectConfig, '   ', {
        directory: 'base',
        type: 'twig',
      }),
    ).rejects.toThrow(
      'Component name must include at least one letter or number.',
    );

    expect(select).not.toHaveBeenCalled();
    expect(findFileInCurrentPath).not.toHaveBeenCalled();
    expect(pathExists).not.toHaveBeenCalled();
  });

  it('throws before prompts or filesystem lookup when the component name contains invalid characters', async () => {
    expect.assertions(4);

    await expect(
      generateComponent(variant, projectConfig, 'featured item', {
        directory: 'base',
        type: 'twig',
      }),
    ).rejects.toThrow(
      'Component name may only include letters, numbers, and single hyphens between words.',
    );

    expect(select).not.toHaveBeenCalled();
    expect(findFileInCurrentPath).not.toHaveBeenCalled();
    expect(pathExists).not.toHaveBeenCalled();
  });

  it('prompts for all four component types in a Drupal project with Core, then prompts for the directory', async () => {
    expect.assertions(4);
    selectMock.mockResolvedValueOnce('twig').mockResolvedValueOnce('base');

    await generateComponent(variant, projectConfig, 'button');

    expect(selectMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message: expect.stringContaining('Choose the component type:'),
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'twig' }),
          expect.objectContaining({ value: 'twig-sdc' }),
          expect.objectContaining({ value: 'react' }),
          expect.objectContaining({ value: 'web-component' }),
        ]),
      }),
    );
    expect(selectMock.mock.calls[0][0].choices).toHaveLength(4);
    expect(selectMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        message: expect.stringContaining(
          'Choose a directory for the new component:',
        ),
      }),
    );
    expect(inputMock).not.toHaveBeenCalled();
  });

  it('offers Twig and Twig SDC in a Drupal project without Core and explains the omission', async () => {
    expect.assertions(3);
    loadJsonFileMock.mockResolvedValueOnce(undefined);
    selectMock.mockResolvedValueOnce('twig');

    await generateComponent(variant, projectConfig, 'button', {
      directory: 'base',
    });

    expect(
      selectMock.mock.calls[0][0].choices.map(
        ({ value }: { value: string }) => value,
      ),
    ).toEqual(['twig', 'twig-sdc']);
    expect(log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(
        'React and Web Component are not shown because @emulsify/core is not declared',
      ),
    );
    expect(inputMock).not.toHaveBeenCalled();
  });

  it('offers Twig, React, and Web Component in a non-Drupal project with Core and explains the omission', async () => {
    expect.assertions(2);
    const wordpressProjectConfig: EmulsifyProjectConfiguration = {
      ...projectConfig,
      project: { ...projectConfig.project, platform: 'wordpress' },
    };
    selectMock.mockResolvedValueOnce('twig');

    await generateComponent(variant, wordpressProjectConfig, 'button', {
      directory: 'base',
    });

    expect(
      selectMock.mock.calls[0][0].choices.map(
        ({ value }: { value: string }) => value,
      ),
    ).toEqual(['twig', 'react', 'web-component']);
    expect(log).toHaveBeenCalledWith(
      'info',
      'Twig SDC is available only for Drupal projects, so it is not shown.',
    );
  });

  it('skips a one-item type prompt and explains every omitted type', async () => {
    expect.assertions(5);
    const neutralProjectConfig: EmulsifyProjectConfiguration = {
      ...projectConfig,
      project: { ...projectConfig.project, platform: 'none' },
    };
    loadJsonFileMock.mockResolvedValueOnce(undefined);
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, neutralProjectConfig, 'button', {
      directory: 'base',
    });

    expect(selectMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'info',
      'Twig SDC is available only for Drupal projects, so it is not shown.',
    );
    expect(log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(
        'React and Web Component are not shown because @emulsify/core is not declared',
      ),
    );
    expect(log).toHaveBeenCalledWith(
      'info',
      'Using Twig, the only detected compatible component type.',
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('button', 'button.twig'),
      expect.any(String),
    );
  });

  it('uses a provided canonical type and directory without prompting', async () => {
    expect.assertions(3);
    setStdinIsTTY(false);
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, projectConfig, 'button', {
      directory: 'base',
      type: 'twig-sdc',
    });

    expect(selectMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('button', 'button.component.yml'),
      expect.stringContaining('name: Button'),
    );
  });

  it.each([
    ['default', 'twig', 'button.yml'],
    ['sdc', 'twig-sdc', 'button.component.yml'],
  ])(
    'maps legacy --format %s to %s and warns',
    async (format, type, expectedFile) => {
      expect.assertions(3);
      setStdinIsTTY(false);
      pathExistsMock.mockResolvedValue(false);

      await generateComponent(variant, projectConfig, 'button', {
        directory: 'base',
        format,
      });

      expect(selectMock).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith(
        'warn',
        `The --format option is deprecated; use --type ${type} instead.`,
      );
      expect(writeFileMock).toHaveBeenCalledWith(
        componentPath('button', expectedFile),
        expect.any(String),
      );
    },
  );

  it('gives --type precedence when both type and deprecated format are provided', async () => {
    expect.assertions(3);
    setStdinIsTTY(false);
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, projectConfig, 'button', {
      directory: 'base',
      type: 'react',
      format: 'sdc',
    });

    expect(log).toHaveBeenCalledWith(
      'warn',
      'The --format option is deprecated and was ignored because --type react was also provided.',
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('button', 'button.jsx'),
      expect.any(String),
    );
    expect(writeFileMock).not.toHaveBeenCalledWith(
      componentPath('button', 'button.twig'),
      expect.anything(),
    );
  });

  it('previews a Twig component without writing files in dry-run mode', async () => {
    expect.assertions(6);
    setStdinIsTTY(false);
    pathExistsMock.mockImplementation((path) => {
      const value = String(path);
      return !isTemplatePath(value) && !value.endsWith(componentPath('card'));
    });

    await generateComponent(variant, projectConfig, 'card', {
      directory: 'base',
      type: 'twig',
      dryRun: true,
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
    expect(mkdirMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Dry run: component create "card"'),
    );
    expect(log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(componentPath('card', 'card.stories.js')),
    );
  });

  it('previews a Twig SDC component without writing files in dry-run mode', async () => {
    expect.assertions(5);
    setStdinIsTTY(false);
    pathExistsMock.mockImplementation((path) => {
      const value = String(path);
      return !isTemplatePath(value) && !value.endsWith(componentPath('teaser'));
    });

    await generateComponent(variant, projectConfig, 'teaser', {
      directory: 'base',
      type: 'twig-sdc',
      dryRun: true,
    });

    expect(removeMock).not.toHaveBeenCalled();
    expect(mkdirMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Type: twig-sdc'),
    );
    expect(log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(componentPath('teaser', 'teaser.component.yml')),
    );
  });

  it('previews an existing destination without prompting or removing in dry-run mode', async () => {
    expect.assertions(5);
    setStdinIsTTY(false);
    pathExistsMock.mockImplementation((path) => !isTemplatePath(path));

    await generateComponent(variant, projectConfig, 'link', {
      directory: 'base',
      type: 'twig',
      dryRun: true,
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Destination exists: yes'),
    );
    expect(log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(
        'Real run would: prompt before replacing the existing component directory',
      ),
    );
  });

  it('throws a clear error when a provided type is invalid', async () => {
    expect.assertions(4);
    setStdinIsTTY(false);

    await expect(
      generateComponent(variant, projectConfig, 'button', {
        directory: 'base',
        type: 'bad',
      }),
    ).rejects.toThrow(
      'Invalid component type "bad". Supported types are: twig, twig-sdc, react, web-component.',
    );

    expect(selectMock).not.toHaveBeenCalled();
    expect(findFileInCurrentPath).not.toHaveBeenCalled();
    expect(pathExists).not.toHaveBeenCalled();
  });

  it('throws a clear error when a provided legacy format is invalid', async () => {
    expect.assertions(4);
    setStdinIsTTY(false);

    await expect(
      generateComponent(variant, projectConfig, 'button', {
        directory: 'base',
        format: 'bad',
      }),
    ).rejects.toThrow(
      'Invalid component format "bad". Supported formats are: default, sdc.',
    );

    expect(selectMock).not.toHaveBeenCalled();
    expect(findFileInCurrentPath).not.toHaveBeenCalled();
    expect(pathExists).not.toHaveBeenCalled();
  });

  it('throws when type is missing in non-interactive mode', async () => {
    expect.assertions(2);
    setStdinIsTTY(false);

    await expect(
      generateComponent(variant, projectConfig, 'button', {
        directory: 'base',
      }),
    ).rejects.toThrow(
      'Component type is required in non-interactive mode. Pass --type <twig|twig-sdc|react|web-component>.',
    );

    expect(selectMock).not.toHaveBeenCalled();
  });

  it('throws when directory is missing in non-interactive mode', async () => {
    expect.assertions(2);
    setStdinIsTTY(false);

    await expect(
      generateComponent(variant, projectConfig, 'button', { type: 'twig' }),
    ).rejects.toThrow(
      'Component directory is required in non-interactive mode. Pass --directory <directory>.',
    );

    expect(selectMock).not.toHaveBeenCalled();
  });

  it('throws an error if the component structure is invalid', async () => {
    expect.assertions(1);
    await expect(
      generateComponent(variant, projectConfig, 'button', {
        directory: 'cornpop',
        type: 'twig',
      }),
    ).rejects.toThrow(
      'The structure (cornpop) specified within the component button is invalid.',
    );
  });

  it('rejects unsafe structure directories before writing or removing files', async () => {
    expect.assertions(3);
    setStdinIsTTY(false);
    pathExistsMock.mockResolvedValue(true);

    await expect(
      generateComponent(
        {
          ...variant,
          structureImplementations: [
            {
              name: 'base',
              directory: '../../outside',
            },
          ],
        } as EmulsifyVariant,
        projectConfig,
        'link',
        {
          directory: 'base',
          type: 'twig',
          yes: true,
        },
      ),
    ).rejects.toThrow(
      `Component structure directory "../../outside" resolves to "${resolve(projectRoot, '../../outside')}", which is outside the expected root "${projectRoot}".`,
    );

    expect(removeMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('should cancel component creation if user declines overwrite', async () => {
    expect.assertions(2);
    confirmMock.mockResolvedValueOnce(false);

    const result = await generateComponent(variant, projectConfig, 'link', {
      directory: 'base',
      type: 'twig',
    });
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('already exists'),
      }),
    );
    expect(result).toBeUndefined(); // Returns early after logging cancellation
  });

  it('skips the overwrite confirm and replaces the component when yes is set', async () => {
    expect.assertions(3);
    setStdinIsTTY(false);

    await generateComponent(variant, projectConfig, 'link', {
      directory: 'base',
      type: 'twig',
      yes: true,
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(removeMock).toHaveBeenCalledWith(componentPath('link'));
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('skips the overwrite confirm and replaces the component when force is set', async () => {
    expect.assertions(3);
    setStdinIsTTY(false);

    await generateComponent(variant, projectConfig, 'link', {
      directory: 'base',
      type: 'twig',
      force: true,
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(removeMock).toHaveBeenCalledWith(componentPath('link'));
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('should continue creation if user confirms overwrite', async () => {
    expect.assertions(2);
    confirmMock.mockResolvedValueOnce(true);

    await generateComponent(variant, projectConfig, 'link', {
      directory: 'base',
      type: 'twig',
    });
    expect(confirm).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it.each([
    [
      'twig',
      [
        'featured-item.twig',
        'featured-item.scss',
        'featured-item.yml',
        'featured-item.stories.js',
      ],
    ],
    [
      'twig-sdc',
      [
        'featured-item.twig',
        'featured-item.scss',
        'featured-item.component.yml',
        'featured-item.js',
        'featured-item.stories.js',
      ],
    ],
    [
      'react',
      ['featured-item.jsx', 'featured-item.scss', 'featured-item.stories.jsx'],
    ],
    [
      'web-component',
      ['featured-item.js', 'featured-item.scss', 'featured-item.stories.js'],
    ],
  ] as const)('writes only the exact %s artifact set', async (type, files) => {
    expect.assertions(2);
    setStdinIsTTY(false);
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, projectConfig, 'featured-item', {
      directory: 'base',
      type,
    });

    expect(
      writeFileMock.mock.calls.map(([path]) => String(path).split(sep).at(-1)),
    ).toEqual(files);
    if (type === 'react' || type === 'web-component') {
      expect(files.some((file) => file.endsWith('.twig'))).toBe(false);
    } else {
      expect(files.some((file) => file.endsWith('.twig'))).toBe(true);
    }
  });

  it.each(['react', 'web-component'] as const)(
    'warns and proceeds with an explicit %s type when Core is not detected',
    async (type) => {
      expect.assertions(2);
      setStdinIsTTY(false);
      pathExistsMock.mockResolvedValue(false);
      loadJsonFileMock.mockResolvedValueOnce(undefined);

      await generateComponent(variant, projectConfig, 'featured-item', {
        directory: 'base',
        type,
      });

      expect(log).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining(
          `The generated ${type} component may require installing @emulsify/core`,
        ),
      );
      expect(writeFileMock).toHaveBeenCalled();
    },
  );

  it('prompts with the derived web component tag and accepts a validated override', async () => {
    expect.assertions(5);
    pathExistsMock.mockResolvedValue(false);
    inputMock.mockImplementationOnce(
      async ({ default: defaultValue, validate }) => {
        expect(defaultValue).toBe('cornflake-button');
        expect(validate('button')).toContain('contain a hyphen');
        expect(validate('custom-button')).toBe(true);
        return ' custom-button ';
      },
    );

    await generateComponent(variant, projectConfig, 'button', {
      directory: 'base',
      type: 'web-component',
    });

    expect(inputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Custom element tag name:'),
        default: 'cornflake-button',
        validate: expect.any(Function),
      }),
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('button', 'button.js'),
      expect.stringContaining(
        "customElements.define('custom-button', ButtonElement);",
      ),
    );
  });

  it('silently uses the filename as a valid hyphenated tag outside a TTY', async () => {
    expect.assertions(2);
    setStdinIsTTY(false);
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, projectConfig, 'featured-item', {
      directory: 'base',
      type: 'web-component',
    });

    expect(inputMock).not.toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('featured-item', 'featured-item.js'),
      expect.stringContaining(
        "customElements.define('featured-item', FeaturedItemElement);",
      ),
    );
  });

  it('rejects an invalid derived tag outside a TTY without writing files', async () => {
    expect.assertions(3);
    setStdinIsTTY(false);
    const invalidMachineNameConfig: EmulsifyProjectConfiguration = {
      ...projectConfig,
      project: { ...projectConfig.project, machineName: '123theme' },
    };

    await expect(
      generateComponent(variant, invalidMachineNameConfig, 'button', {
        directory: 'base',
        type: 'web-component',
      }),
    ).rejects.toThrow(
      'Invalid custom element tag name "123theme-button". Names must start with an ASCII lowercase letter',
    );

    expect(inputMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('uses a rendered project template override when present', async () => {
    expect.assertions(4);
    mockTemplateOverrides({
      'default/component.twig':
        '<article class="{{ className }}">{{ humanName }} {{ filename }} {{ directory }} {{ format }}</article>',
    });

    await generateComponent(variant, projectConfig, 'featuredItem', {
      directory: 'base',
      type: 'twig',
    });

    expect(readFileMock).toHaveBeenCalledWith(
      projectTemplatePath('default', 'component.twig'),
      'utf8',
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('featured-item', 'featured-item.twig'),
      '<article class="featured-item">Featured Item featured-item base default</article>',
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('featured-item', 'featured-item.scss'),
      expect.stringContaining('Base Styles for featured-item (STANDARD)'),
    );
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('keeps ordinary Twig variables in a canonical override', async () => {
    expect.assertions(2);
    mockTemplateOverrides({
      'twig/component.twig':
        "{% set type = 'promo' %}<span>{{ type }}</span><h2>__EMULSIFY_humanName__</h2>",
    });

    await generateComponent(variant, projectConfig, 'featuredItem', {
      directory: 'base',
      type: 'twig',
    });

    expect(readFileMock).toHaveBeenCalledWith(
      projectTemplatePath('twig', 'component.twig'),
      'utf8',
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('featured-item', 'featured-item.twig'),
      "{% set type = 'promo' %}<span>{{ type }}</span><h2>Featured Item</h2>",
    );
  });

  it('allows partial project template overrides per artifact', async () => {
    expect.assertions(2);
    mockTemplateOverrides({
      'default/component.scss': '.{{ className }} { color: red; }\n',
    });

    await generateComponent(variant, projectConfig, 'featuredItem', {
      directory: 'base',
      type: 'twig',
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('featured-item', 'featured-item.twig'),
      expect.stringContaining('featured-item.twig'),
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('featured-item', 'featured-item.scss'),
      '.featured-item { color: red; }\n',
    );
  });

  it('falls back to the built-in template and warns when an override is empty', async () => {
    expect.assertions(2);
    mockTemplateOverrides({
      'default/component.yml': '\n ',
    });

    await generateComponent(variant, projectConfig, 'featuredItem', {
      directory: 'base',
      type: 'twig',
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('featured-item', 'featured-item.yml'),
      `featured_item__heading: 'Featured Item Component'
featured_item__content: 'This is the content area of the Featured Item component, created using the standard Emulsify format. Replace with your markup and data.'
`,
    );
    expect(log).toHaveBeenCalledWith(
      'warn',
      `Component template override "${projectTemplatePath('default', 'component.yml')}" is empty; using the built-in template instead.`,
    );
  });

  it('keeps unknown override tokens and logs a warning', async () => {
    expect.assertions(2);
    mockTemplateOverrides({
      'default/component.twig': '{{ humanName }} {{ unknownToken }}',
    });

    await generateComponent(variant, projectConfig, 'featuredItem', {
      directory: 'base',
      type: 'twig',
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      componentPath('featured-item', 'featured-item.twig'),
      'Featured Item {{ unknownToken }}',
    );
    expect(log).toHaveBeenCalledWith(
      'warn',
      'Unknown component template token "{{ unknownToken }}" left unchanged.',
    );
  });

  it('writes Twig component files with byte-for-byte template content', async () => {
    expect.assertions(1);
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, projectConfig, 'featuredItem', {
      directory: 'base',
      type: 'twig',
    });

    expect(writeFileMock.mock.calls).toEqual([
      [
        componentPath('featured-item', 'featured-item.twig'),
        `{#
/**
 * @file
 * featured-item.twig
 * Format: STANDARD
 *
 * Available variables:
 * - featured_item__heading - the heading text for this component
 * - featured_item__content - the body content of this component (typically text)
 *
 * Available blocks:
 * - featured_item__content - override the content area with custom markup,
 *   for example: to embed an image or icon
 */
 #}
{% set featured_item__base_class = 'featured-item' %}

<article class="{{ featured_item__base_class }}">
  {% if featured_item__heading %}
    <h2 class="{{ featured_item__base_class }}__heading">{{ featured_item__heading }}</h2>
  {% endif %}
  {% block featured_item__content %}
    <div class="{{ featured_item__base_class }}__content">
      {{ featured_item__content }}
    </div>
  {% endblock %}
</article>
`,
      ],
      [
        componentPath('featured-item', 'featured-item.scss'),
        `/*
 * Base Styles for featured-item (STANDARD)
 *
 * These styles are provided as a starting point.
 * Replace or extend them to match your project's design system.
 */
.featured-item {
  font-family: system-ui, -apple-system, sans-serif;
  width: 100%;
  max-width: 85ch;
  margin: 4rem auto;
}

.featured-item__heading {
  margin: 0 0 0.75rem 0;
  font-size: 2.2rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.featured-item__content {
  color: #475569;
  font-size: 1rem;
  line-height: 1.7;
}
`,
      ],
      [
        componentPath('featured-item', 'featured-item.yml'),
        `featured_item__heading: 'Featured Item Component'
featured_item__content: 'This is the content area of the Featured Item component, created using the standard Emulsify format. Replace with your markup and data.'
`,
      ],
      [
        componentPath('featured-item', 'featured-item.stories.js'),
        `import featuredItemTwig from './featured-item.twig';
import featuredItemData from './featured-item.yml';

/**
 * Storybook Definition.
 */
export default { title: 'Base/Featured Item' };

export const featuredItem = () => featuredItemTwig(featuredItemData);
`,
      ],
    ]);
  });

  it('writes Twig SDC component files with byte-for-byte template content', async () => {
    expect.assertions(2);
    pathExistsMock.mockResolvedValue(false);
    const expectedSdcJs = `/**
 * @file
 * JavaScript for the featured-item component.
 */
Drupal.behaviors.featuredItem = {
  attach(context) {
    const elements = context.querySelectorAll('.featured-item');
    elements.forEach((el) => {
      console.log('featured-item component attached:', el);
    });
  },
};
`;

    await generateComponent(variant, projectConfig, 'featuredItem', {
      directory: 'base',
      type: 'twig-sdc',
    });

    expect(expectedSdcJs).not.toContain('\t');
    expect(writeFileMock.mock.calls).toEqual([
      [
        componentPath('featured-item', 'featured-item.twig'),
        `{#
/**
 * @file
 * featured-item.twig
 * Format: SDC
 *
 * Available variables:
 * - featured_item__heading - the heading text for this component
 * - featured_item__content - the body content of this component (typically text)
 *
 * Available blocks:
 * - featured_item__content - override the content area with custom markup,
 *   for example: to embed an image or icon
 */
 #}
{% set featured_item__base_class = 'featured-item' %}

<article class="{{ featured_item__base_class }}">
  {% if featured_item__heading %}
    <h2 class="{{ featured_item__base_class }}__heading">{{ featured_item__heading }}</h2>
  {% endif %}
  {% block featured_item__content %}
    <div class="{{ featured_item__base_class }}__content">
      {{ featured_item__content }}
    </div>
  {% endblock %}
</article>
`,
      ],
      [
        componentPath('featured-item', 'featured-item.scss'),
        `/*
 * Base Styles for featured-item (SDC)
 *
 * These styles are provided as a starting point.
 * Replace or extend them to match your project's design system.
 */
.featured-item {
  font-family: system-ui, -apple-system, sans-serif;
  width: 100%;
  max-width: 85ch;
  margin: 4rem auto;
}

.featured-item__heading {
  margin: 0 0 0.75rem 0;
  font-size: 2.2rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.featured-item__content {
  color: #475569;
  font-size: 1rem;
  line-height: 1.7;
}
`,
      ],
      [
        componentPath('featured-item', 'featured-item.component.yml'),
        `$schema: https://git.drupalcode.org/project/drupal/-/raw/11.x/core/modules/sdc/src/metadata.schema.json
name: Featured Item
group: Custom
status: stable
props:
  type: object
  properties:
    featured_item__heading:
      type: string
      title: Heading
      data: 'Featured Item Component'
    featured_item__content:
      type: string
      title: Content
      data: 'This is the content area of the Featured Item component, created using the Single Directory Component (SDC) format for Drupal. Replace with your markup and data.'
`,
      ],
      [componentPath('featured-item', 'featured-item.js'), expectedSdcJs],
      [
        componentPath('featured-item', 'featured-item.stories.js'),
        `import featuredItemTwig from './featured-item.twig';
import { props } from './featured-item.component.yml';
import './featured-item';

const featuredItemData = props.properties;

/**
 * Storybook Definition.
 */
export default { 
  title: 'Base/Featured Item',
  args: {
    heading: featuredItemData.featured_item__heading.data,
    content: featuredItemData.featured_item__content.data,
  },
};

export const featuredItem = ({ heading, content }) => 
  featuredItemTwig({
    featured_item__heading: heading,
    featured_item__content: content,
  });
`,
      ],
    ]);
  });
});
