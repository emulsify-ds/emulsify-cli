import type { Colorette } from 'colorette';

const NATURAL_WIDTH = 80;
const COMMAND_COLUMN_WIDTH = 32;
const OPTION_COLUMN_WIDTH = 31;
const STEP_COMMAND_WIDTH = 36;

type HelpColors = Pick<Colorette, 'bold' | 'cyan' | 'dim'>;

type HelpRow = {
  description: string;
  kind: 'command' | 'option';
  label: string;
};

type HelpSection = {
  heading: string;
  rows: HelpRow[];
};

export type RootHelpOptions = {
  colors: HelpColors;
  columns?: number;
  description: string;
  productName: string;
  version: string;
};

const steps = [
  ['emulsify init', 'create the project'],
  ['emulsify system install', 'pick a component system'],
  ['emulsify component list', 'see what you can install'],
  ['emulsify component install <name>', 'add a component'],
] as const;

const sections: HelpSection[] = [
  {
    heading: 'PROJECTS',
    rows: [
      {
        kind: 'command',
        label: 'init [name] [path]',
        description: 'Create a project from a starter repository',
      },
      {
        kind: 'option',
        label: '-m, --machineName <name>',
        description: 'Folder and config machine name',
      },
      {
        kind: 'option',
        label: '-s, --starter <repository>',
        description: 'Use a custom starter repository',
      },
      {
        kind: 'option',
        label: '-c, --checkout <ref>',
        description: 'Starter commit, branch, or tag',
      },
      {
        kind: 'option',
        label: '-p, --platform <platform>',
        description: 'none | drupal | wordpress',
      },
      {
        kind: 'option',
        label: '-y, --yes',
        description: 'Accept defaults without prompting',
      },
    ],
  },
  {
    heading: 'COMPONENTS',
    rows: [
      {
        kind: 'command',
        label: 'component list',
        description: 'Show what the installed system offers',
      },
      {
        kind: 'command',
        label: 'component install [name]',
        description: 'Copy a component into your project',
      },
      {
        kind: 'option',
        label: '-a, --all',
        description: 'Install every available component',
      },
      {
        kind: 'option',
        label: '-f, --force',
        description: 'Replace an existing destination',
      },
      {
        kind: 'option',
        label: '--dry-run',
        description: 'Preview without writing files',
      },
      {
        kind: 'command',
        label: 'component create [name]',
        description: 'Generate a new local component',
      },
      {
        kind: 'option',
        label: '-d, --directory <dir>',
        description: 'Variant structure to create it in',
      },
      {
        kind: 'option',
        label: '-f, --format <default|sdc>',
        description: 'Component format',
      },
      {
        kind: 'option',
        label: '--dry-run',
        description: 'Preview without writing files',
      },
    ],
  },
  {
    heading: 'SYSTEMS',
    rows: [
      {
        kind: 'command',
        label: 'system list',
        description: 'Show built-in systems',
      },
      {
        kind: 'command',
        label: 'system install [name]',
        description: 'Add a component system to this project',
      },
      {
        kind: 'option',
        label: '-r, --repository <repo>',
        description: 'Install from a git repository',
      },
      {
        kind: 'option',
        label: '-c, --checkout <ref>',
        description: 'Commit, branch, or tag',
      },
      {
        kind: 'option',
        label: '-a, --all',
        description: 'Install every component, not just required',
      },
      {
        kind: 'command',
        label: 'system create [name]',
        description: 'Scaffold a system others can install from',
      },
    ],
  },
  {
    heading: 'MAINTENANCE',
    rows: [
      {
        kind: 'command',
        label: 'audit [args...]',
        description: 'Run the Emulsify Core audit',
      },
      {
        kind: 'command',
        label: 'cache clear',
        description: 'Remove cached system repositories',
      },
      {
        kind: 'option',
        label: '--dry-run',
        description: 'Preview cache removal',
      },
    ],
  },
];

function normalizeWidth(columns: number | undefined): number {
  return typeof columns === 'number' && Number.isFinite(columns) && columns > 0
    ? Math.floor(columns)
    : NATURAL_WIDTH;
}

function wrapWords(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = '';

  for (const word of text.split(/\s+/)) {
    if (current && current.length + word.length + 1 <= width) {
      current += ` ${word}`;
      continue;
    }

    if (current) {
      lines.push(current);
      current = '';
    }

    let remainder = word;
    while (remainder.length > width) {
      lines.push(remainder.slice(0, width));
      remainder = remainder.slice(width);
    }
    current = remainder;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function wrapIndented(text: string, indent: number, width: number): string[] {
  const usableIndent = Math.min(indent, Math.max(0, width - 1));
  const prefix = ' '.repeat(usableIndent);
  const contentWidth = Math.max(1, width - usableIndent);

  return wrapWords(text, contentWidth).map((line) => `${prefix}${line}`);
}

function renderStackedRow(
  row: HelpRow,
  width: number,
  colors: HelpColors,
): string[] {
  const labelIndent = row.kind === 'option' ? 6 : 2;
  const descriptionIndent = row.kind === 'option' ? 8 : 4;
  const style = row.kind === 'option' ? colors.dim : colors.bold;
  const descriptionStyle =
    row.kind === 'option' ? colors.dim : (value: string) => value;

  return [
    ...wrapIndented(row.label, labelIndent, width).map(style),
    ...wrapIndented(row.description, descriptionIndent, width).map(
      descriptionStyle,
    ),
  ];
}

function renderRow(row: HelpRow, width: number, colors: HelpColors): string[] {
  const indent = row.kind === 'option' ? '      ' : '  ';
  const columnWidth =
    row.kind === 'option' ? OPTION_COLUMN_WIDTH : COMMAND_COLUMN_WIDTH;
  const gap = ' '.repeat(Math.max(2, columnWidth - row.label.length));
  const plainLine = `${indent}${row.label}${gap}${row.description}`;

  if (width < NATURAL_WIDTH || plainLine.length > width) {
    return renderStackedRow(row, width, colors);
  }

  if (row.kind === 'option') {
    return [colors.dim(plainLine)];
  }

  return [`${indent}${colors.bold(row.label)}${gap}${row.description}`];
}

function renderStep(
  step: (typeof steps)[number],
  index: number,
  width: number,
  colors: HelpColors,
): string[] {
  const [command, description] = step;
  const prefix = `    ${index + 1}  `;
  const gap = ' '.repeat(Math.max(2, STEP_COMMAND_WIDTH - command.length));
  const plainLine = `${prefix}${command}${gap}${description}`;

  if (width < NATURAL_WIDTH || plainLine.length > width) {
    const commandPrefix = `    ${index + 1}  `;
    const continuationPrefix = ' '.repeat(commandPrefix.length);
    const commandLines = wrapWords(
      command,
      Math.max(1, width - commandPrefix.length),
    );

    return [
      ...commandLines.map((line, commandLineIndex) =>
        colors.bold(
          `${commandLineIndex === 0 ? commandPrefix : continuationPrefix}${line}`,
        ),
      ),
      ...wrapIndented(description, 7, width),
    ];
  }

  return [`${prefix}${colors.bold(command)}${gap}${description}`];
}

/**
 * Render the root help text without writing to stdout.
 */
export default function getRootHelp({
  colors,
  columns,
  description,
  productName,
  version,
}: RootHelpOptions): string {
  const width = normalizeWidth(columns);
  const lines = [
    ...wrapWords(`${productName} ${version}`, width).map((line) =>
      colors.bold(colors.cyan(line)),
    ),
    '',
    ...wrapWords(description, width),
    '',
    ...wrapIndented('New here? Run these in order:', 2, width).map(colors.bold),
  ];

  for (const [index, step] of steps.entries()) {
    lines.push(...renderStep(step, index, width, colors));
  }
  lines.push('');

  for (const section of sections) {
    lines.push(colors.bold(colors.cyan(section.heading)));
    for (const row of section.rows) {
      lines.push(...renderRow(row, width, colors));
    }
    lines.push('');
  }

  const refresh = '--refresh works on every component command.';
  const switches = '-V, --version   -h, --help';
  if (width >= NATURAL_WIDTH) {
    lines.push(colors.dim(`  ${refresh}   ${switches}`));
  } else {
    lines.push(...wrapIndented(refresh, 2, width).map(colors.dim));
    const switchLine = `  ${switches}`;
    lines.push(
      ...(switchLine.length <= width
        ? [colors.dim(switchLine)]
        : wrapIndented(switches, 2, width).map(colors.dim)),
    );
  }
  lines.push(
    ...wrapIndented(
      'emulsify <command> --help for the full option list.',
      2,
      width,
    ),
    '',
  );

  return lines.join('\n');
}
