import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(new URL('../../dist/index.js', import.meta.url));

test('system list exits quietly when its output consumer closes the pipe', async () => {
  const child = spawn(process.execPath, [cliPath, 'system', 'list'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
    windowsHide: true,
  });
  // Close the reader immediately so the first write reliably hits EPIPE.
  child.stdout.destroy();

  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', (chunk) => {
    stderr += chunk;
  });

  const [code, signal] = await once(child, 'close');
  assert.equal(signal, null);
  assert.equal(code, 0, stderr);
  assert.equal(stderr, '');
});
