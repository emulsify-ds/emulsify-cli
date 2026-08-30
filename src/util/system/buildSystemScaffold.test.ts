import {
  buildScssTemplate,
  buildStoriesTemplate,
  buildTwigTemplate,
  buildYmlTemplate,
} from '../project/componentTemplates/index.js';
import validateSystemConfig from './validateSystemConfig.js';
import buildSystemScaffold, {
  buildSystemDefinition,
  type BuildSystemScaffoldOptions,
} from './buildSystemScaffold.js';

const options: BuildSystemScaffoldOptions = {
  name: 'acme-system',
  platform: 'drupal || wordpress',
  homepage: 'https://example.com/acme-system',
  repository: 'https://github.com/example/acme-system.git',
};

describe('buildSystemScaffold', () => {
  it('builds a schema-valid system definition with an installable example component', async () => {
    const systemConfig = buildSystemDefinition(options);

    expect(systemConfig).toEqual({
      name: 'acme-system',
      homepage: 'https://example.com/acme-system',
      repository: 'https://github.com/example/acme-system.git',
      structure: [
        {
          name: 'components',
          description: 'Reusable components provided by this system',
        },
      ],
      variants: [
        {
          platform: 'drupal || wordpress',
          structureImplementations: [
            {
              name: 'components',
              directory: 'components',
            },
          ],
          components: [
            {
              name: 'example-card',
              structure: 'components',
              description: 'Example card included with the generated system',
              required: true,
            },
          ],
        },
      ],
    });
    await expect(validateSystemConfig(systemConfig)).resolves.toEqual({
      valid: true,
      systemConfig,
    });
  });

  it('returns documentation, repository metadata, and standard component artifacts', () => {
    const scaffold = buildSystemScaffold(options);
    const files = Object.fromEntries(
      scaffold.files.map(({ path, contents }) => [path, contents]),
    );

    expect(scaffold.systemConfig).toEqual(buildSystemDefinition(options));
    expect(Object.keys(files)).toEqual([
      'README.md',
      '.gitignore',
      'LICENSE',
      'components/example-card/example-card.twig',
      'components/example-card/example-card.scss',
      'components/example-card/example-card.yml',
      'components/example-card/example-card.stories.js',
    ]);
    expect(files['README.md']).toContain('# acme-system');
    expect(files['README.md']).toContain('targeting `drupal || wordpress`');
    expect(files['README.md']).toContain(
      'emulsify system install --repository https://github.com/example/acme-system.git --checkout <tag>',
    );
    expect(files['README.md']).toContain(
      'Homepage: https://example.com/acme-system',
    );
    expect(files['.gitignore']).toBe('.DS_Store\nnode_modules/\n');
    expect(files['LICENSE']).toContain('replace this placeholder');
    expect(files['components/example-card/example-card.twig']).toBe(
      buildTwigTemplate(
        'example-card',
        'example_card',
        'example-card',
        'STANDARD',
      ),
    );
    expect(files['components/example-card/example-card.scss']).toBe(
      buildScssTemplate('example-card', 'STANDARD'),
    );
    expect(files['components/example-card/example-card.yml']).toBe(
      buildYmlTemplate('example_card', 'Example Card'),
    );
    expect(files['components/example-card/example-card.stories.js']).toBe(
      buildStoriesTemplate(
        'exampleCard',
        'example-card',
        'Example Card',
        'Components',
      ),
    );
  });
});
