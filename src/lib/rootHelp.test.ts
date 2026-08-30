import { createColors } from 'colorette';
import getRootHelp from './rootHelp.js';

const description =
  'Build and use component systems in Drupal, WordPress, or standalone front ends.';
const plainColors = createColors({ useColor: false });
const coloredColors = createColors({ useColor: true });
const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/gu;

function render(columns?: number, colors = plainColors): string {
  return getRootHelp({
    colors,
    columns,
    description,
    productName: 'Emulsify CLI',
    version: '2.4.0',
  });
}

function visibleLines(value: string): string[] {
  return value.replace(ansiPattern, '').trimEnd().split('\n');
}

describe('getRootHelp', () => {
  it('renders the canonical grouped layout when columns are unavailable', () => {
    const help = render();

    expect(help).toContain('Emulsify CLI 2.4.0');
    expect(help).toContain(description);
    expect(help).toContain('PROJECTS');
    expect(help).toContain('COMPONENTS');
    expect(help).toContain('SYSTEMS');
    expect(help).toContain('system detach');
    expect(help).toContain('Detach the system and keep project components');
    expect(help).toContain('system create [name]');
    expect(help).toContain('MAINTENANCE');
    expect(help).toContain('audit [args...]');
    expect(help).toContain('component eject-templates [type]');
    expect(help).toContain('Write editable built-in templates');
    expect(help).toContain('Eject every component template type');
    expect(help).toContain(
      '      --force                        Replace an existing generated component',
    );
    expect(help).toContain('--refresh works on list, install, and create.');
    expect(help).not.toContain('component ls');
    expect(
      Math.max(...visibleLines(help).map((line) => line.length)),
    ).toBeLessThanOrEqual(80);
  });

  it('applies the provided color palette without changing visible copy', () => {
    const colored = render(80, coloredColors);

    expect(colored).toContain('\u001b[');
    expect(colored.replace(ansiPattern, '')).toBe(render(80));
  });

  it('stacks two-column rows and wraps prose at 60 columns', () => {
    const help = render(60);

    expect(help).toContain(
      '  component create [name]\n    Generate a new local component',
    );
    expect(help).toContain(
      '      -t, --type <type>\n        twig | twig-sdc | react | web-component',
    );
    expect(help).toContain(
      '      -f, --format <default|sdc>\n        Deprecated Twig type alias',
    );
    expect(help).toContain(
      '  component eject-templates [type]\n    Write editable built-in templates',
    );
    expect(
      Math.max(...visibleLines(help).map((line) => line.length)),
    ).toBeLessThanOrEqual(60);
  });

  it('hard-wraps indivisible values in extremely narrow terminals', () => {
    const help = render(12);

    expect(
      Math.max(...visibleLines(help).map((line) => line.length)),
    ).toBeLessThanOrEqual(12);
  });

  it.each([0, Number.NaN, Number.POSITIVE_INFINITY])(
    'uses the canonical width for invalid column count %s',
    (columns) => {
      expect(render(columns)).toBe(render());
    },
  );
});
