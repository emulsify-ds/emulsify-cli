import CliError from '../../lib/CliError.js';
import {
  classifyComponentNpmDependencies,
  collectComponentNpmDependencies,
} from './componentNpmDependencies.js';

const system = 'Example System';
const component = 'slider';
const requirements = [
  { name: 'swiper', range: '^11.2.0', components: [component] },
];

describe('collectComponentNpmDependencies', () => {
  it.each([
    'swiper',
    '@scope/0pkg-name._~',
    '@0scope/pkg',
    'constructor',
    'a'.repeat(214),
  ])('accepts the npm package name %s', (name) => {
    expect(
      collectComponentNpmDependencies(system, [
        { name: component, npmDependencies: { [name]: '^11.2.0' } },
      ]),
    ).toEqual([{ name, range: '^11.2.0', components: [component] }]);
  });

  it.each([
    'Swiper',
    '.swiper',
    '_swiper',
    '-swiper',
    'a'.repeat(215),
    '@scope',
    '@scope/-swiper',
    '@_scope/swiper',
    '@scope/more/swiper',
    'swiper\n',
  ])('rejects the npm package name %j', (name) => {
    const collect = () =>
      collectComponentNpmDependencies(system, [
        { name: component, npmDependencies: { [name]: '^11.2.0' } },
      ]);

    expect(collect).toThrow(CliError);
    expect(collect).toThrow(
      `System "Example System", component "slider", npm package ${JSON.stringify(name)} has an invalid npm package name.`,
    );
  });

  it.each(['^1.0.0', '~1.2', '1.x', '>=1.0.0', '>0.0.0', '>=1 <2', '>=1\n<2'])(
    'accepts the semver range %j',
    (range) => {
      expect(
        collectComponentNpmDependencies(system, [
          { name: component, npmDependencies: { swiper: range } },
        ]),
      ).toEqual([{ ...requirements[0], range }]);
    },
  );

  it.each(['*', 'x', 'X', '>=0.0.0', '>=0.0.0-0', '', '  '])(
    'rejects a range that admits every version (%j) with its context',
    (range) => {
      const collect = () =>
        collectComponentNpmDependencies(system, [
          { name: component, npmDependencies: { swiper: range } },
        ]);

      expect(collect).toThrow(CliError);
      expect(collect).toThrow(
        `System "Example System", component "slider", npm package "swiper" must declare a bounded semver range. Received ${JSON.stringify(range)}, which admits every version.`,
      );
    },
  );

  it.each([
    'latest',
    'https://example.invalid/package.tgz',
    'git+https://example.invalid/package.git',
    'github:example/package',
    'file:../package',
    'link:../package',
    'npm:other@^1.0.0',
    'workspace:*',
  ])('rejects the spec %s with its context', (range) => {
    const collect = () =>
      collectComponentNpmDependencies(system, [
        { name: component, npmDependencies: { swiper: range } },
      ]);

    expect(collect).toThrow(CliError);
    expect(collect).toThrow(
      `System "Example System", component "slider", npm package "swiper" must use a valid semver range. Received ${JSON.stringify(range)}.`,
    );
  });

  it('ignores components with no npm packages', () => {
    expect(
      collectComponentNpmDependencies(system, [
        { name: 'button' },
        { name: 'icon', npmDependencies: {} },
      ]),
    ).toEqual([]);
  });

  it.each([
    ['^11.2.0', '^11.2.0', '^11.2.0'],
    ['^11.2.0', '^11.3.0', '^11.3.0'],
    ['^11.3.0', '^11.2.0', '^11.3.0'],
    ['>=11 <13', '>=12 <14', '>=12.0.0 <13.0.0'],
    ['>=11.0.0 <12.0.0', '>=11.2.0 <13.0.0', '>=11.2.0 <12.0.0'],
    ['^11.0.0', '>=11.1.0', '>=11.1.0 <12.0.0'],
    ['^10 || ^12', '^10 || ^13', '>=10.0.0 <11.0.0-0'],
    ['>=1.0.0-beta <2.0.0', '>=0.5.0 <1.1.0', '>=1.0.0 <1.1.0'],
    ['>1.0.0 <1.0.1-beta', '>1.0.0 <1.0.1-alpha', '>1.0.0 <1.0.1-alpha'],
    ['>1.2.9007199254740991', '<1.3.1', '>1.2.9007199254740991 <1.3.1'],
  ])('merges %s and %s as %s', (first, second, range) => {
    expect(
      collectComponentNpmDependencies(system, [
        { name: component, npmDependencies: { swiper: first } },
        { name: 'carousel', npmDependencies: { swiper: second } },
      ]),
    ).toEqual([{ name: 'swiper', range, components: [component, 'carousel'] }]);
  });

  it.each([
    ['^11.2.0', '^12.0.0'],
    ['>1.0.0', '<1.0.1'],
    ['>1.2.9007199254740991', '<1.3.0'],
    ['1.2.3-alpha', '>=1.2.0 <1.3.0'],
  ])('reports both components and ranges when %s conflicts with %s', (a, b) => {
    const collect = () =>
      collectComponentNpmDependencies(system, [
        { name: component, npmDependencies: { swiper: a } },
        { name: 'carousel', npmDependencies: { swiper: b } },
      ]);

    expect(collect).toThrow(CliError);
    expect(collect).toThrow(
      `System "Example System", component "carousel", npm package "swiper" requires "${b}", which conflicts with "${a}" required by component "slider".`,
    );
  });

  it('reports all components when pairwise intersections have no shared version', () => {
    expect(() =>
      collectComponentNpmDependencies(system, [
        { name: component, npmDependencies: { swiper: '^10 || ^11' } },
        { name: 'carousel', npmDependencies: { swiper: '^11 || ^12' } },
        { name: 'gallery', npmDependencies: { swiper: '^10 || ^12' } },
      ]),
    ).toThrow(
      'component "gallery", npm package "swiper" requires "^10 || ^12", which conflicts with the combined range ">=11.0.0 <12.0.0-0" required by components "slider", "carousel".',
    );
  });

  it('reports individual invalid entries while retaining other declarations', () => {
    const report = jest.fn<void, [CliError]>();

    expect(
      collectComponentNpmDependencies(
        system,
        [
          {
            name: component,
            npmDependencies: { '../evil': '^1.0.0', swiper: '^11.0.0' },
          },
          {
            name: 'carousel',
            npmDependencies: {
              swiper: '^12.0.0',
              classnames: '^3.0.0',
              chalk: 'latest',
            },
          },
          { name: 'gallery', npmDependencies: { swiper: '^11.4.0' } },
        ],
        report,
      ),
    ).toEqual([
      { name: 'swiper', range: '^11.4.0', components: [component, 'gallery'] },
      { name: 'classnames', range: '^3.0.0', components: ['carousel'] },
    ]);
    expect(report.mock.calls.map(([error]) => error.message)).toEqual([
      expect.stringContaining('"../evil" has an invalid npm package name'),
      expect.stringContaining(
        'requires "^12.0.0", which conflicts with "^11.0.0"',
      ),
      expect.stringContaining('"chalk" must use a valid semver range'),
    ]);
  });
});

describe('classifyComponentNpmDependencies', () => {
  it('classifies absent entries as missing and ignores inherited keys', () => {
    expect(
      classifyComponentNpmDependencies(
        [...requirements, { ...requirements[0], name: 'constructor' }],
        { dependencies: {}, optionalDependencies: null },
      ),
    ).toEqual([
      { ...requirements[0], status: 'missing' },
      { ...requirements[0], name: 'constructor', status: 'missing' },
    ]);
  });

  it.each([
    ['dependencies', '11.2.6'],
    ['dependencies', '^11.3.0'],
    ['devDependencies', '^11.2.0'],
  ])('accepts satisfying range %s with value %s', (section, declaredRange) => {
    expect(
      classifyComponentNpmDependencies(requirements, {
        [section]: { swiper: declaredRange },
      }),
    ).toEqual([{ ...requirements[0], status: 'satisfied' }]);
  });

  it.each([
    '^11.0.0',
    '^10.3.0',
    'latest',
    'workspace:*',
    'git+https://example.invalid/swiper.git',
    false,
  ])('flags the declaration %j for attention', (declaredRange) => {
    expect(
      classifyComponentNpmDependencies(requirements, {
        dependencies: { swiper: declaredRange },
      }),
    ).toEqual([
      { ...requirements[0], status: 'needs-attention', declaredRange },
    ]);
  });

  it('flags an incompatible direct declaration even when another direct section satisfies it', () => {
    expect(
      classifyComponentNpmDependencies(requirements, {
        dependencies: { swiper: '11.2.6' },
        devDependencies: { swiper: '^10.3.0' },
      }),
    ).toEqual([
      {
        ...requirements[0],
        status: 'needs-attention',
        declaredRange: '^10.3.0',
      },
    ]);
  });

  it('treats a peer dependency as missing and names its manifest section', () => {
    expect(
      classifyComponentNpmDependencies(requirements, {
        peerDependencies: { swiper: '^11.2.0' },
      }),
    ).toEqual([
      {
        ...requirements[0],
        status: 'missing',
        nonSatisfyingSections: ['peerDependencies'],
      },
    ]);
  });

  it('allows a direct dependency to satisfy a requirement even with a peer declaration', () => {
    expect(
      classifyComponentNpmDependencies(requirements, {
        dependencies: { swiper: '^11.2.0' },
        peerDependencies: { swiper: '^11.2.0' },
      }),
    ).toEqual([
      {
        ...requirements[0],
        status: 'satisfied',
        nonSatisfyingSections: ['peerDependencies'],
      },
    ]);
  });

  it.each([{}, { dependencies: { swiper: '^11.2.0' } }])(
    'flags optional dependencies for attention with direct declarations %j',
    (direct) => {
      expect(
        classifyComponentNpmDependencies(requirements, {
          ...direct,
          optionalDependencies: { swiper: '~11.4.0' },
        }),
      ).toEqual([
        {
          ...requirements[0],
          status: 'needs-attention',
          declaredRange: '~11.4.0',
          nonSatisfyingSections: ['optionalDependencies'],
        },
      ]);
    },
  );

  it('ignores manifest sections that are not dependency maps', () => {
    const requirement = { ...requirements[0], name: '0' };

    expect(
      classifyComponentNpmDependencies([requirement], {
        dependencies: { other: '^1.0.0' },
        devDependencies: '^11.2.0',
        optionalDependencies: ['^11.2.0'],
      }),
    ).toEqual([{ ...requirement, status: 'missing' }]);
  });
});
