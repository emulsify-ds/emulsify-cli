import type { SpawnSyncReturns } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import audit, {
  executeCoreAudit,
  getAuditProjectRoot,
  resolveCoreAuditBin,
} from './audit.js';

jest.unmock('child_process');
jest.unmock('node:child_process');
jest.unmock('fs');
jest.unmock('node:fs');
jest.unmock('fs/promises');
jest.unmock('node:fs/promises');

const { spawnSync } =
  jest.requireActual<typeof import('node:child_process')>('node:child_process');
const { mkdir, mkdtemp, realpath, rm, writeFile } =
  jest.requireActual<typeof import('node:fs/promises')>('node:fs/promises');

const repositoryRoot = process.cwd();
const registerPath = join(repositoryRoot, 'src/register.mjs');
const cliPath = join(repositoryRoot, 'src/index.ts');
const fakeAuditRelativePath = './bin with spaces/fake audit.mjs';
const fakeAuditSource = `
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const stdin = readFileSync(0, 'utf8');
const exitOption = args.indexOf('--fake-exit');
const exitCode = exitOption === -1 ? 0 : Number(args[exitOption + 1]);
const report = {
  source: '@emulsify/core',
  args,
  stdin,
};

if (args.includes('--help')) {
  process.stdout.write('CORE AUDIT HELP\\n');
} else if (args.includes('--json')) {
  process.stdout.write(\`\${JSON.stringify(report)}\\n\`);
} else {
  process.stdout.write(\`CORE HUMAN \${JSON.stringify(report)}\\n\`);
}

if (args.includes('--fake-stderr')) {
  process.stderr.write('CORE STDERR\\n');
}

process.exitCode = exitCode;
`;

interface FakeCoreOptions {
  bin?: unknown;
  packageMetadata?: unknown;
  writeAuditTarget?: boolean;
}

interface FakeCoreProject {
  auditPath: string;
  projectRoot: string;
  tempRoot: string;
}

interface CliResult {
  status: number | null;
  stderr: string;
  stdout: string;
}

const tempRoots: string[] = [];

async function createFakeCoreProject(
  options: FakeCoreOptions = {},
): Promise<FakeCoreProject> {
  const bin = Object.prototype.hasOwnProperty.call(options, 'bin')
    ? options.bin
    : {
        'emulsify-audit': fakeAuditRelativePath,
      };
  const packageMetadata = Object.prototype.hasOwnProperty.call(
    options,
    'packageMetadata',
  )
    ? options.packageMetadata
    : {
        name: '@emulsify/core',
        version: '4.3.0-fixture',
        type: 'module',
        exports: {
          './package.json': './package.json',
        },
        bin,
      };
  const { writeAuditTarget = true } = options;
  const tempRoot = await mkdtemp(join(tmpdir(), 'emulsify cli audit '));
  const projectRoot = join(tempRoot, 'project with spaces');
  const coreRoot = join(projectRoot, 'node_modules', '@emulsify', 'core');
  const auditPath = resolve(coreRoot, fakeAuditRelativePath);
  tempRoots.push(tempRoot);

  await mkdir(dirname(auditPath), { recursive: true });
  await writeFile(
    join(projectRoot, 'package.json'),
    `${JSON.stringify({ name: 'fake-emulsify-project' }, null, 2)}\n`,
  );
  await writeFile(
    join(coreRoot, 'package.json'),
    `${JSON.stringify(packageMetadata, null, 2)}\n`,
  );

  if (writeAuditTarget) {
    await writeFile(auditPath, fakeAuditSource);
  }

  return {
    auditPath: writeAuditTarget ? await realpath(auditPath) : auditPath,
    projectRoot,
    tempRoot,
  };
}

function createSpawnResult(
  status: number | null,
  error?: Error,
): SpawnSyncReturns<Buffer> {
  return {
    pid: 123,
    output: [null, null, null],
    stdout: null,
    stderr: null,
    status,
    signal: null,
    ...(error ? { error } : {}),
  } as unknown as SpawnSyncReturns<Buffer>;
}

function runSourceCli(cwd: string, args: string[], input = ''): CliResult {
  const result = spawnSync(
    process.execPath,
    ['--import', registerPath, cliPath, ...args],
    {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NODE_NO_WARNINGS: '1',
        NO_COLOR: '1',
        TS_NODE_CWD: repositoryRoot,
        TS_NODE_PROJECT: join(repositoryRoot, 'tsconfig.json'),
        TS_NODE_TRANSPILE_ONLY: 'true',
      },
      input,
    },
  );

  return {
    status: result.status,
    stderr: String(result.stderr),
    stdout: String(result.stdout),
  };
}

function runCli(cwd: string, args: string[], input = ''): CliResult {
  return runSourceCli(cwd, ['audit', ...args], input);
}

afterEach(async () => {
  process.exitCode = undefined;
  jest.restoreAllMocks();

  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => rm(tempRoot, { recursive: true, force: true })),
  );
});

test('selects the last valid separate or inline root without rewriting args', () => {
  const cwd = resolve('/workspace with spaces');

  expect(getAuditProjectRoot([], cwd)).toBe(cwd);
  expect(getAuditProjectRoot(['--root', 'first project'], cwd)).toBe(
    resolve(cwd, 'first project'),
  );
  expect(
    getAuditProjectRoot(
      ['--root=first project', '--root', 'second project'],
      cwd,
    ),
  ).toBe(resolve(cwd, 'second project'));
  expect(getAuditProjectRoot(['--root', '--json'], cwd)).toBe(cwd);
  expect(getAuditProjectRoot(['--root='], cwd)).toBe(cwd);
});

test('resolves the declared Core audit target through fake package metadata', async () => {
  const fixture = await createFakeCoreProject();

  expect(resolveCoreAuditBin(fixture.projectRoot)).toBe(fixture.auditPath);
  expect(fixture.auditPath).toContain(' ');
});

test('reports a missing project-installed Core package', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'emulsify cli missing core '));
  tempRoots.push(tempRoot);
  await writeFile(join(tempRoot, 'package.json'), '{}\n');

  expect(() => resolveCoreAuditBin(tempRoot)).toThrow(
    expect.objectContaining({
      message: expect.stringContaining(
        '@emulsify/core is not installed for project root',
      ),
      exitCode: 2,
    }),
  );
});

test.each([
  ['missing bin metadata', undefined],
  ['non-object bin metadata', fakeAuditRelativePath],
  ['missing audit entry', {}],
  ['empty audit entry', { 'emulsify-audit': '' }],
  ['non-string audit entry', { 'emulsify-audit': 42 }],
])('reports %s as an unsupported Core audit bin', async (_label, bin) => {
  const fixture = await createFakeCoreProject({ bin });

  expect(() => resolveCoreAuditBin(fixture.projectRoot)).toThrow(
    expect.objectContaining({
      message: expect.stringContaining(
        'does not expose package.json#bin["emulsify-audit"]',
      ),
      exitCode: 2,
    }),
  );
});

test.each([null, []])(
  'reports non-object Core package metadata',
  async (packageMetadata) => {
    const fixture = await createFakeCoreProject({ packageMetadata });

    expect(() => resolveCoreAuditBin(fixture.projectRoot)).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          'Unable to read the installed @emulsify/core package metadata',
        ),
        exitCode: 2,
      }),
    );
  },
);

test('reports an unavailable declared audit target', async () => {
  const fixture = await createFakeCoreProject({
    writeAuditTarget: false,
  });

  expect(() => resolveCoreAuditBin(fixture.projectRoot)).toThrow(
    expect.objectContaining({
      message: expect.stringContaining(
        'declares an unavailable "emulsify-audit" target',
      ),
      exitCode: 2,
    }),
  );
});

test.each([0, 1, 2])(
  'forwards the exact invocation and returns Core exit status %s',
  (exitCode) => {
    const spawnProcess = jest.fn().mockReturnValue(createSpawnResult(exitCode));
    const args = [
      '--json',
      '--fail-on',
      'warn',
      '--root',
      'project with spaces',
    ];

    expect(
      executeCoreAudit(
        '/core path/audit script.mjs',
        args,
        '/caller path',
        '/node path/node',
        spawnProcess,
      ),
    ).toBe(exitCode);
    expect(spawnProcess).toHaveBeenCalledWith(
      '/node path/node',
      ['/core path/audit script.mjs', ...args],
      {
        cwd: '/caller path',
        shell: false,
        stdio: 'inherit',
      },
    );
  },
);

test('reports synchronous and returned process startup failures', () => {
  const thrownFailure = jest.fn(() => {
    throw new Error('spawn unavailable');
  });
  const returnedFailure = jest
    .fn()
    .mockReturnValue(createSpawnResult(null, new Error('spawn EACCES')));

  expect(() =>
    executeCoreAudit(
      '/core/audit.mjs',
      [],
      '/project',
      process.execPath,
      thrownFailure,
    ),
  ).toThrow(
    expect.objectContaining({
      message: expect.stringContaining(
        'Unable to start the project-installed "emulsify-audit" process: spawn unavailable',
      ),
      exitCode: 2,
    }),
  );
  expect(() =>
    executeCoreAudit(
      '/core/audit.mjs',
      [],
      '/project',
      process.execPath,
      returnedFailure,
    ),
  ).toThrow(
    expect.objectContaining({
      message: expect.stringContaining('spawn EACCES'),
      exitCode: 2,
    }),
  );
});

test('reports a child process that ends without an exit status', () => {
  const spawnProcess = jest.fn().mockReturnValue(createSpawnResult(null));

  expect(() =>
    executeCoreAudit(
      '/core/audit.mjs',
      [],
      '/project',
      process.execPath,
      spawnProcess,
    ),
  ).toThrow(
    expect.objectContaining({
      message: expect.stringContaining('ended without an exit status'),
      exitCode: 2,
    }),
  );
});

test('the handler resolves from --root and assigns Core status without logging', async () => {
  const fixture = await createFakeCoreProject();
  const callerRoot = fixture.tempRoot;
  const relativeRoot = relative(callerRoot, fixture.projectRoot);
  const args = ['--root', relativeRoot, '--json'];
  const spawnProcess = jest.fn().mockReturnValue(createSpawnResult(1));

  audit(args, {
    cwd: callerRoot,
    execPath: '/node path/node',
    spawnProcess,
  });

  expect(process.exitCode).toBe(1);
  expect(spawnProcess).toHaveBeenCalledWith(
    '/node path/node',
    [fixture.auditPath, ...args],
    {
      cwd: callerRoot,
      shell: false,
      stdio: 'inherit',
    },
  );
});

test('forwards human stdout, stderr, and stdin byte-for-byte', async () => {
  const fixture = await createFakeCoreProject();
  const args = ['--future-flag', 'value with spaces', '--fake-stderr'];
  const input = 'forwarded stdin\n';
  const result = runCli(fixture.projectRoot, args, input);
  const report = {
    source: '@emulsify/core',
    args,
    stdin: input,
  };

  expect(result.status).toBe(0);
  expect(result.stdout).toBe(`CORE HUMAN ${JSON.stringify(report)}\n`);
  expect(result.stderr).toBe('CORE STDERR\n');
});

test.each([0, 1, 2])(
  'keeps JSON stdout Core-only while preserving exit status %s',
  async (exitCode) => {
    const fixture = await createFakeCoreProject();
    const args = ['--json', '--fake-exit', String(exitCode)];
    const result = runCli(fixture.projectRoot, args);
    const expectedDocument = {
      source: '@emulsify/core',
      args,
      stdin: '',
    };

    expect(result.status).toBe(exitCode);
    expect(result.stdout).toBe(`${JSON.stringify(expectedDocument)}\n`);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual(expectedDocument);
  },
);

test('resolves a relative requested root containing spaces and preserves argv', async () => {
  const fixture = await createFakeCoreProject();
  const relativeRoot = relative(fixture.tempRoot, fixture.projectRoot);
  const args = [
    '--root',
    relativeRoot,
    '--json',
    '--future-option',
    'future value with spaces',
  ];
  const result = runCli(fixture.tempRoot, args, 'input through spaces');

  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    source: '@emulsify/core',
    args,
    stdin: 'input through spaces',
  });
  expect(result.stderr).toBe('');
});

test('delegates audit help to Core without Commander prose', async () => {
  const fixture = await createFakeCoreProject();
  const result = runCli(fixture.projectRoot, ['--help']);

  expect(result).toMatchObject({
    status: 0,
    stdout: 'CORE AUDIT HELP\n',
    stderr: '',
  });
});

test('advertises audit in root help', () => {
  const result = runSourceCli(repositoryRoot, ['--help']);

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('emulsify audit [...args]');
  expect(result.stderr).toBe('');
});

test('the command reports missing Core and malformed bin metadata as exit 2', async () => {
  const missingRoot = await mkdtemp(
    join(tmpdir(), 'emulsify cli missing project '),
  );
  tempRoots.push(missingRoot);
  await writeFile(join(missingRoot, 'package.json'), '{}\n');
  const missingResult = runCli(missingRoot, ['--json']);

  expect(missingResult.status).toBe(2);
  expect(missingResult.stdout).toBe('');
  expect(missingResult.stderr).toContain('@emulsify/core is not installed');

  const malformedFixture = await createFakeCoreProject({ bin: {} });
  const malformedResult = runCli(malformedFixture.projectRoot, ['--json']);

  expect(malformedResult.status).toBe(2);
  expect(malformedResult.stdout).toBe('');
  expect(malformedResult.stderr).toContain(
    'does not expose package.json#bin["emulsify-audit"]',
  );
});
