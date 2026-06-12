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

import { select, confirm } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import { pathExists, remove } from 'fs-extra';
import log from '../../lib/log.js';
import generateComponent from './generateComponent.js';
import { EmulsifyVariant } from '@emulsify-cli/config';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';

const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/home/uname/Projects/cornflake/web/themes/custom/themename/project.emulsify.json',
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

const pathExistsMock = (pathExists as jest.Mock).mockResolvedValue(true);
const removeMock = remove as jest.Mock;
const readFileMock = fs.readFile as jest.Mock;
const writeFileMock = fs.writeFile as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;

function setStdinIsTTY(value: boolean | undefined) {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

function isTemplatePath(path: unknown): boolean {
  return String(path).includes('/.cli/templates/');
}

function mockTemplateOverrides(
  overrides: Record<string, string>,
  componentExists = false,
) {
  pathExistsMock.mockImplementation((path) => {
    const value = String(path);

    if (isTemplatePath(value)) {
      return Object.keys(overrides).some((templatePath) =>
        value.endsWith(templatePath),
      );
    }

    if (value.includes('/components/00-base/')) {
      return componentExists;
    }

    return true;
  });
  readFileMock.mockImplementation(async (path) => {
    const value = String(path);
    const templatePath = Object.keys(overrides).find((key) =>
      value.endsWith(key),
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
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('throws an error if the user is not within an Emulsify project', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(generateComponent(variant, 'button')).rejects.toThrow(
      'Unable to find an Emulsify project to create the component into.',
    );
  });

  it('throws before prompts or filesystem lookup when the component name is empty after sanitizing', async () => {
    expect.assertions(4);

    await expect(
      generateComponent(variant, '   ', { directory: 'base' }),
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
      generateComponent(variant, 'featured item', { directory: 'base' }),
    ).rejects.toThrow(
      'Component name may only include letters, numbers, and single hyphens between words.',
    );

    expect(select).not.toHaveBeenCalled();
    expect(findFileInCurrentPath).not.toHaveBeenCalled();
    expect(pathExists).not.toHaveBeenCalled();
  });

  it('should prompt for the format and then the directory if not provided', async () => {
    expect.assertions(2);
    (select as jest.Mock)
      .mockResolvedValueOnce('default') // format
      .mockResolvedValueOnce('base'); // directory

    await generateComponent(variant, 'button');
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Choose the component format:'),
      }),
    );
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Choose a directory for the new component:',
        ),
      }),
    );
  });

  it('uses a provided format and directory without prompting', async () => {
    expect.assertions(3);
    setStdinIsTTY(false);
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, 'button', {
      directory: 'base',
      format: 'sdc',
    });

    expect(select).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/button/button.component.yml',
      expect.stringContaining('name: Button'),
    );
  });

  it('throws a clear error when a provided format is invalid', async () => {
    expect.assertions(4);
    setStdinIsTTY(false);

    await expect(
      generateComponent(variant, 'button', {
        directory: 'base',
        format: 'bad',
      }),
    ).rejects.toThrow(
      'Invalid component format "bad". Supported formats are: default, sdc.',
    );

    expect(select).not.toHaveBeenCalled();
    expect(findFileInCurrentPath).not.toHaveBeenCalled();
    expect(pathExists).not.toHaveBeenCalled();
  });

  it('throws when format is missing in non-interactive mode', async () => {
    expect.assertions(2);
    setStdinIsTTY(false);

    await expect(
      generateComponent(variant, 'button', { directory: 'base' }),
    ).rejects.toThrow(
      'Component format is required in non-interactive mode. Pass --format default or --format sdc.',
    );

    expect(select).not.toHaveBeenCalled();
  });

  it('throws when directory is missing in non-interactive mode', async () => {
    expect.assertions(2);
    setStdinIsTTY(false);

    await expect(
      generateComponent(variant, 'button', { format: 'default' }),
    ).rejects.toThrow(
      'Component directory is required in non-interactive mode. Pass --directory <directory>.',
    );

    expect(select).not.toHaveBeenCalled();
  });

  it('throws an error if the component structure is invalid', async () => {
    expect.assertions(1);
    (select as jest.Mock).mockResolvedValueOnce('default'); // format
    await expect(
      generateComponent(variant, 'button', { directory: 'cornpop' }),
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
        'link',
        {
          directory: 'base',
          format: 'default',
          yes: true,
        },
      ),
    ).rejects.toThrow(
      'Component structure directory "../../outside" resolves to "/home/uname/Projects/cornflake/web/themes/outside", which is outside the expected root "/home/uname/Projects/cornflake/web/themes/custom/themename".',
    );

    expect(removeMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('should cancel component creation if user declines overwrite', async () => {
    expect.assertions(2);
    (select as jest.Mock).mockResolvedValueOnce('default'); // format
    (confirm as jest.Mock).mockResolvedValueOnce(false); // decline overwrite

    const result = await generateComponent(variant, 'link', {
      directory: 'base',
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

    await generateComponent(variant, 'link', {
      directory: 'base',
      format: 'default',
      yes: true,
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(removeMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/link',
    );
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('should continue creation if user confirms overwrite', async () => {
    expect.assertions(2);
    (select as jest.Mock).mockResolvedValueOnce('default'); // format
    (confirm as jest.Mock).mockResolvedValueOnce(true); // confirm overwrite

    await generateComponent(variant, 'link', { directory: 'base' });
    expect(confirm).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('should create an SDC component structure', async () => {
    expect.assertions(1);
    (select as jest.Mock)
      .mockResolvedValueOnce('sdc') // format
      .mockResolvedValueOnce('base'); // directory
    // Mock parent path exists, but destination does NOT exist
    pathExistsMock.mockImplementation(
      (path) => !isTemplatePath(path) && !String(path).endsWith('mario'),
    );

    await generateComponent(variant, 'mario');
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('should generate a standard (Default) component when selected', async () => {
    (select as jest.Mock)
      .mockResolvedValueOnce('default') // Format selection
      .mockResolvedValueOnce('base'); // Directory selection
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, 'my-button');

    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('uses a rendered project template override when present', async () => {
    expect.assertions(4);
    (select as jest.Mock).mockResolvedValueOnce('default');
    mockTemplateOverrides({
      'default/component.twig':
        '<article class="{{ className }}">{{ humanName }} {{ filename }} {{ directory }} {{ format }}</article>',
    });

    await generateComponent(variant, 'featuredItem', {
      directory: 'base',
    });

    expect(readFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/web/themes/custom/themename/.cli/templates/default/component.twig',
      'utf8',
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.twig',
      '<article class="featured-item">Featured Item featured-item base default</article>',
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.scss',
      expect.stringContaining('Base Styles for featured-item (STANDARD)'),
    );
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('allows partial project template overrides per artifact', async () => {
    expect.assertions(2);
    (select as jest.Mock).mockResolvedValueOnce('default');
    mockTemplateOverrides({
      'default/component.scss': '.{{ className }} { color: red; }\n',
    });

    await generateComponent(variant, 'featuredItem', {
      directory: 'base',
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.twig',
      expect.stringContaining('featured-item.twig'),
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.scss',
      '.featured-item { color: red; }\n',
    );
  });

  it('falls back to the built-in template and warns when an override is empty', async () => {
    expect.assertions(2);
    (select as jest.Mock).mockResolvedValueOnce('default');
    mockTemplateOverrides({
      'default/component.yml': '\n ',
    });

    await generateComponent(variant, 'featuredItem', {
      directory: 'base',
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.yml',
      `featured_item__heading: 'Featured Item Component'
featured_item__content: 'This is the content area of the Featured Item component, created using the standard Emulsify format. Replace with your markup and data.'
`,
    );
    expect(log).toHaveBeenCalledWith(
      'warn',
      'Component template override "/home/uname/Projects/cornflake/web/themes/custom/themename/.cli/templates/default/component.yml" is empty; using the built-in template instead.',
    );
  });

  it('keeps unknown override tokens and logs a warning', async () => {
    expect.assertions(2);
    (select as jest.Mock).mockResolvedValueOnce('default');
    mockTemplateOverrides({
      'default/component.twig': '{{ humanName }} {{ unknownToken }}',
    });

    await generateComponent(variant, 'featuredItem', {
      directory: 'base',
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.twig',
      'Featured Item {{ unknownToken }}',
    );
    expect(log).toHaveBeenCalledWith(
      'warn',
      'Unknown component template token "{{ unknownToken }}" left unchanged.',
    );
  });

  it('writes default component files with byte-for-byte template content', async () => {
    expect.assertions(1);
    (select as jest.Mock).mockResolvedValueOnce('default');
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, 'featuredItem', {
      directory: 'base',
    });

    expect(writeFileMock.mock.calls).toEqual([
      [
        '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.twig',
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
        '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.scss',
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
        '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.yml',
        `featured_item__heading: 'Featured Item Component'
featured_item__content: 'This is the content area of the Featured Item component, created using the standard Emulsify format. Replace with your markup and data.'
`,
      ],
      [
        '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.stories.js',
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

  it('writes SDC component files with byte-for-byte template content', async () => {
    expect.assertions(2);
    (select as jest.Mock).mockResolvedValueOnce('sdc');
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

    await generateComponent(variant, 'featuredItem', {
      directory: 'base',
    });

    expect(expectedSdcJs).not.toContain('\t');
    expect(writeFileMock.mock.calls).toEqual([
      [
        '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.twig',
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
        '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.scss',
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
        '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.component.yml',
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
      [
        '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.js',
        expectedSdcJs,
      ],
      [
        '/home/uname/Projects/cornflake/web/themes/custom/themename/components/00-base/featured-item/featured-item.stories.js',
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
