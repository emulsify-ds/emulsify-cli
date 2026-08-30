import type { EmulsifySystem, PlatformExpression } from '@emulsify-cli/config';
import {
  buildScssTemplate,
  buildStoriesTemplate,
  buildTwigTemplate,
  buildYmlTemplate,
} from '../project/componentTemplates/index.js';

const COMPONENT_STRUCTURE_NAME = 'components';
const EXAMPLE_COMPONENT_NAME = 'example-card';
const EXAMPLE_COMPONENT_CAMEL_NAME = 'exampleCard';
const EXAMPLE_COMPONENT_SNAKE_NAME = 'example_card';
const EXAMPLE_COMPONENT_HUMAN_NAME = 'Example Card';
const DEFAULT_FORMAT_LABEL = 'DEFAULT';

export type BuildSystemScaffoldOptions = {
  name: string;
  platform: PlatformExpression;
  homepage: string;
  repository: string;
};

export type SystemScaffoldArtifact = {
  path: string;
  contents: string;
};

export type SystemScaffold = {
  systemConfig: EmulsifySystem;
  files: SystemScaffoldArtifact[];
};

/**
 * Build the system definition for a standalone generated system repository.
 */
export function buildSystemDefinition({
  name,
  platform,
  homepage,
  repository,
}: BuildSystemScaffoldOptions): EmulsifySystem {
  return {
    name,
    homepage,
    repository,
    structure: [
      {
        name: COMPONENT_STRUCTURE_NAME,
        description: 'Reusable components provided by this system',
      },
    ],
    variants: [
      {
        platform,
        structureImplementations: [
          {
            name: COMPONENT_STRUCTURE_NAME,
            directory: COMPONENT_STRUCTURE_NAME,
          },
        ],
        components: [
          {
            name: EXAMPLE_COMPONENT_NAME,
            structure: COMPONENT_STRUCTURE_NAME,
            description: 'Example card included with the generated system',
            required: true,
          },
        ],
      },
    ],
  };
}

function buildReadme({
  name,
  platform,
  homepage,
  repository,
}: BuildSystemScaffoldOptions): string {
  return `# ${name}

An [Emulsify](https://www.emulsify.info/) component system targeting \`${platform}\`.

## Included component

- \`example-card\`: a standard Emulsify component ready to customize or replace.

## Use this system

1. Replace the example metadata and component with your system's content.
2. Replace the placeholder in \`LICENSE\` with the license for this system.
3. Commit the repository and create a stable tag.
4. Install that tag from an Emulsify project:

   \`\`\`bash
   emulsify system install --repository ${repository} --checkout <tag>
   \`\`\`

Homepage: ${homepage}
`;
}

/**
 * Build a complete, filesystem-independent scaffold for a system repository.
 */
export default function buildSystemScaffold(
  options: BuildSystemScaffoldOptions,
): SystemScaffold {
  const exampleComponentDirectory = `${COMPONENT_STRUCTURE_NAME}/${EXAMPLE_COMPONENT_NAME}`;

  return {
    systemConfig: buildSystemDefinition(options),
    files: [
      {
        path: 'README.md',
        contents: buildReadme(options),
      },
      {
        path: '.gitignore',
        contents: '.DS_Store\nnode_modules/\n',
      },
      {
        path: 'LICENSE',
        contents:
          'Choose a license for this system and replace this placeholder before distribution.\n',
      },
      {
        path: `${exampleComponentDirectory}/${EXAMPLE_COMPONENT_NAME}.twig`,
        contents: buildTwigTemplate(
          EXAMPLE_COMPONENT_NAME,
          EXAMPLE_COMPONENT_SNAKE_NAME,
          EXAMPLE_COMPONENT_NAME,
          DEFAULT_FORMAT_LABEL,
        ),
      },
      {
        path: `${exampleComponentDirectory}/${EXAMPLE_COMPONENT_NAME}.scss`,
        contents: buildScssTemplate(
          EXAMPLE_COMPONENT_NAME,
          DEFAULT_FORMAT_LABEL,
        ),
      },
      {
        path: `${exampleComponentDirectory}/${EXAMPLE_COMPONENT_NAME}.yml`,
        contents: buildYmlTemplate(
          EXAMPLE_COMPONENT_SNAKE_NAME,
          EXAMPLE_COMPONENT_HUMAN_NAME,
        ),
      },
      {
        path: `${exampleComponentDirectory}/${EXAMPLE_COMPONENT_NAME}.stories.js`,
        contents: buildStoriesTemplate(
          EXAMPLE_COMPONENT_CAMEL_NAME,
          EXAMPLE_COMPONENT_NAME,
          EXAMPLE_COMPONENT_HUMAN_NAME,
          COMPONENT_STRUCTURE_NAME,
        ),
      },
    ],
  };
}
