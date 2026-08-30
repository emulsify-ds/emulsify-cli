import getTerminalColors, { terminalSupportsColor } from './terminalColors.js';

const output = (isTTY: boolean | undefined) =>
  ({ isTTY }) as Pick<NodeJS.WriteStream, 'isTTY'>;
const originalIsTTYDescriptor = Object.getOwnPropertyDescriptor(
  process.stdout,
  'isTTY',
);
const originalNoColor = process.env.NO_COLOR;
const hadNoColor = Object.prototype.hasOwnProperty.call(
  process.env,
  'NO_COLOR',
);

describe('terminal colors', () => {
  afterEach(() => {
    if (originalIsTTYDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', originalIsTTYDescriptor);
    } else {
      delete (process.stdout as { isTTY?: boolean }).isTTY;
    }

    if (hadNoColor) {
      process.env.NO_COLOR = originalNoColor;
    } else {
      delete process.env.NO_COLOR;
    }
  });

  it.each([
    ['stdout is not a TTY', false, {}, false],
    ['stdout TTY state is unavailable', undefined, {}, false],
    ['NO_COLOR is unset in a TTY', true, {}, true],
    ['NO_COLOR has a value in a TTY', true, { NO_COLOR: '1' }, false],
    ['NO_COLOR is empty in a TTY', true, { NO_COLOR: '' }, false],
    ['NO_COLOR is zero in a TTY', true, { NO_COLOR: '0' }, false],
  ])('%s', (_label, isTTY, environment, expected) => {
    expect(terminalSupportsColor(output(isTTY), environment)).toBe(expected);
  });

  it('creates an ANSI-enabled palette when color is supported', () => {
    expect(getTerminalColors(output(true), {}).cyan('message')).toContain(
      '\u001b[',
    );
  });

  it('creates a plain palette when color is suppressed', () => {
    expect(
      getTerminalColors(output(true), { NO_COLOR: '1' }).cyan('message'),
    ).toBe('message');
  });

  it('uses the current process output and environment by default', () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: true,
    });
    delete process.env.NO_COLOR;

    expect(terminalSupportsColor()).toBe(true);
    expect(getTerminalColors().bold('message')).toContain('\u001b[');
  });
});
