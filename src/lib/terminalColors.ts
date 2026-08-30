import { createColors, type Colorette } from 'colorette';

type TerminalOutput = Pick<NodeJS.WriteStream, 'isTTY'>;

/**
 * Determine whether CLI-authored color is appropriate for the current output.
 * Color is deliberately limited to interactive stdout and disabled whenever
 * NO_COLOR is present, regardless of its value.
 */
export function terminalSupportsColor(
  output: TerminalOutput = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    output.isTTY === true &&
    !Object.prototype.hasOwnProperty.call(environment, 'NO_COLOR')
  );
}

/**
 * Return a Colorette palette configured with the CLI's shared color policy.
 */
export default function getTerminalColors(
  output: TerminalOutput = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): Colorette {
  return createColors({
    useColor: terminalSupportsColor(output, environment),
  });
}
