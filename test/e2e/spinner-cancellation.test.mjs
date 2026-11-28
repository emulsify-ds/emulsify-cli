import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cliPath = fileURLToPath(new URL('../../dist/index.js', import.meta.url));
const ptyAvailable =
  process.platform !== 'win32' &&
  spawnSync('python3', ['-c', 'import pty; pty.openpty()'], {
    stdio: 'ignore',
    timeout: 5_000,
  }).status === 0;

// forkpty gives the CLI a real terminal. Removing the readiness marker lets
// the fake npm exit even when the CLI has already exited.
const interrupt = String.raw`
import contextlib, errno, fcntl, os, pty, select, signal, struct, sys, termios, time

ready, *command = sys.argv[1:]
pid, master = pty.fork()
if pid == 0:
    os.execv(command[0], command)

deadline = time.monotonic() + 15
sent = reaped = False
try:
    fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 80, 0, 0))
    while time.monotonic() < deadline:
        if not sent and os.path.exists(ready):
            os.write(master, b'\x03')
            sent = True
        if select.select([master], [], [], 0.05)[0]:
            try:
                sys.stdout.buffer.write(os.read(master, 4096))
            except OSError as error:
                if error.errno != errno.EIO:
                    raise
        exited, status = os.waitpid(pid, os.WNOHANG)
        if exited:
            reaped = True
            if not sent:
                sys.exit('CLI exited before npm started')
            if os.WIFEXITED(status):
                sys.exit(os.WEXITSTATUS(status))
            sys.exit(128 + os.WTERMSIG(status))
    sys.exit('Timed out waiting for CLI spinner cancellation')
finally:
    if not reaped:
        with contextlib.suppress(ProcessLookupError):
            os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    with contextlib.suppress(FileNotFoundError):
        os.unlink(ready)
    os.close(master)
`;

test(
  'Ctrl-C during the init spinner exits 130 and removes its target',
  { skip: ptyAvailable ? false : 'Requires python3 and a POSIX PTY' },
  () => {
    const fixture = mkdtempSync(join(tmpdir(), 'emulsify-pty-'));
    try {
      const starter = join(fixture, 'starter');
      const scratch = join(fixture, 'scratch');
      const bin = join(fixture, 'bin');
      const ready = join(fixture, 'npm-started');
      for (const directory of [starter, scratch, bin]) mkdirSync(directory);
      writeFileSync(join(starter, 'package.json'), '{"name":"starter"}\n');
      writeFileSync(
        join(bin, 'npm'),
        '#!/bin/sh\n: > "$EMULSIFY_E2E_NPM_READY" || exit\nwhile [ -f "$EMULSIFY_E2E_NPM_READY" ]; do sleep 0.05; done\n',
        { mode: 0o755 },
      );

      const env = {
        ...process.env,
        GIT_CONFIG_GLOBAL: join(fixture, '.gitconfig'),
        GIT_CONFIG_NOSYSTEM: '1',
        PATH: [bin, process.env.PATH].filter(Boolean).join(delimiter),
        EMULSIFY_E2E_NPM_READY: ready,
      };
      const git = (...args) =>
        execFileSync('git', args, { cwd: starter, env, stdio: 'pipe' });
      git('init', '--initial-branch=main');
      git('add', 'package.json');
      git(
        '-c',
        'user.email=e2e@example.test',
        '-c',
        'user.name=Emulsify E2E',
        'commit',
        '-m',
        'test: create starter fixture',
      );

      const result = spawnSync(
        'python3',
        [
          '-c',
          interrupt,
          ready,
          process.execPath,
          cliPath,
          'init',
          'myTheme',
          './',
          '-p',
          'drupal',
          '-y',
          '--starter',
          starter,
        ],
        { cwd: scratch, env, encoding: 'utf8', timeout: 20_000 },
      );

      if (result.error) throw result.error;
      assert.deepEqual(
        {
          status: result.status,
          targetExists: existsSync(join(scratch, 'mytheme')),
        },
        { status: 130, targetExists: false },
        `${result.stdout}\n${result.stderr}`,
      );
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  },
);
