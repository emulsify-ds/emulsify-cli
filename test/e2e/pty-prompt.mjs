import { spawnSync } from 'node:child_process';

export const hasPty =
  process.platform !== 'win32' &&
  spawnSync('python3', ['-c', 'import pty; pty.openpty()'], {
    stdio: 'ignore',
    timeout: 5_000,
  }).status === 0;

const interact = String.raw`
import errno, fcntl, json, os, pty, select, struct, subprocess, sys, termios, time

actions = iter(json.loads(sys.argv[1]))
action = next(actions, None)
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 120, 0, 0))
child = subprocess.Popen(sys.argv[2:], stdin=slave, stdout=slave, stderr=slave)
os.close(slave)

output = bytearray()
deadline = time.monotonic() + 10
try:
    while time.monotonic() < deadline:
        if not select.select([master], [], [], 0.05)[0]:
            continue
        try:
            chunk = os.read(master, 4096)
        except OSError as error:
            if error.errno != errno.EIO:
                raise
            break
        if not chunk:
            break
        sys.stdout.buffer.write(chunk)
        output.extend(chunk)
        if action and action[0].encode() in output:
            # Leave the second prompt open long enough to expose eager copies.
            if action[1] == '\x03':
                time.sleep(0.2)
            os.write(master, action[1].encode())
            action = next(actions, None)
            output.clear()
    if action:
        sys.exit('Expected prompt: ' + action[0])
    sys.exit(child.wait(timeout=1))
finally:
    if child.poll() is None:
        child.kill()
        child.wait()
    os.close(master)
`;

export function runPtyPrompt(command, actions, { cwd, env }) {
  const result = spawnSync(
    'python3',
    ['-c', interact, JSON.stringify(actions), ...command],
    { cwd, env: { ...env, NO_COLOR: '1' }, encoding: 'utf8', timeout: 15_000 },
  );
  if (result.error) throw result.error;
  return result;
}
