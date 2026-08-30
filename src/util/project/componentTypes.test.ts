/**
 * @file Unit tests for component type normalization and project availability.
 */

jest.mock('../fs/loadJsonFile', () => jest.fn());

import { join, resolve } from 'path';

import loadJsonFile from '../fs/loadJsonFile.js';
import {
  componentTypeFromLegacyFormat,
  getAvailableComponentTypes,
  getCompatibleFormatToken,
  normalizeComponentType,
  projectDeclaresEmulsifyCore,
} from './componentTypes.js';

const loadJsonFileMock = loadJsonFile as jest.Mock;
const projectRoot = resolve('/project');

describe('component type utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeComponentType', () => {
    it.each([
      [' twig ', 'twig'],
      ['TWIG-SDC', 'twig-sdc'],
      ['React', 'react'],
      ['WEB-COMPONENT', 'web-component'],
    ])('normalizes %p to %p', (value, expected) => {
      expect.assertions(1);

      expect(normalizeComponentType(value)).toBe(expected);
    });

    it('rejects unsupported component types', () => {
      expect.assertions(1);

      expect(() => normalizeComponentType('sdc')).toThrow(
        'Invalid component type "sdc". Supported types are: twig, twig-sdc, react, web-component.',
      );
    });
  });

  describe('componentTypeFromLegacyFormat', () => {
    it.each([
      [' default ', 'twig'],
      ['SDC', 'twig-sdc'],
    ])('maps legacy format %p to %p', (value, expected) => {
      expect.assertions(1);

      expect(componentTypeFromLegacyFormat(value)).toBe(expected);
    });

    it('rejects unsupported legacy formats', () => {
      expect.assertions(1);

      expect(() => componentTypeFromLegacyFormat('react')).toThrow(
        'Invalid component format "react". Supported formats are: default, sdc.',
      );
    });
  });

  it.each([
    ['twig', 'default'],
    ['twig-sdc', 'sdc'],
    ['react', 'react'],
    ['web-component', 'web-component'],
  ] as const)('uses the compatible format token for %s', (type, expected) => {
    expect.assertions(1);

    expect(getCompatibleFormatToken(type)).toBe(expected);
  });

  describe('getAvailableComponentTypes', () => {
    it.each([
      ['drupal', true, ['twig', 'twig-sdc', 'react', 'web-component']],
      ['drupal', false, ['twig', 'twig-sdc']],
      ['wordpress', true, ['twig', 'react', 'web-component']],
      ['wordpress', false, ['twig']],
    ] as const)(
      'filters the %s wizard choices when Core detection is %s',
      (platform, hasEmulsifyCore, expected) => {
        expect.assertions(1);

        expect(getAvailableComponentTypes(platform, hasEmulsifyCore)).toEqual(
          expected,
        );
      },
    );

    it('treats a platform-independent project like other non-Drupal projects', () => {
      expect.assertions(1);

      expect(getAvailableComponentTypes('none', true)).toEqual([
        'twig',
        'react',
        'web-component',
      ]);
    });
  });

  describe('projectDeclaresEmulsifyCore', () => {
    it('detects Core in project dependencies', async () => {
      expect.assertions(2);
      loadJsonFileMock.mockResolvedValueOnce({
        dependencies: { '@emulsify/core': '^4.4.0' },
      });

      await expect(projectDeclaresEmulsifyCore(projectRoot)).resolves.toBe(
        true,
      );
      expect(loadJsonFileMock).toHaveBeenCalledWith(
        join(projectRoot, 'package.json'),
      );
    });

    it('detects Core in project development dependencies', async () => {
      expect.assertions(1);
      loadJsonFileMock.mockResolvedValueOnce({
        devDependencies: { '@emulsify/core': 'workspace:*' },
      });

      await expect(projectDeclaresEmulsifyCore(projectRoot)).resolves.toBe(
        true,
      );
    });

    it('returns false when package.json is missing', async () => {
      expect.assertions(1);
      loadJsonFileMock.mockResolvedValueOnce(undefined);

      await expect(projectDeclaresEmulsifyCore(projectRoot)).resolves.toBe(
        false,
      );
    });

    it('returns false when package.json is malformed', async () => {
      expect.assertions(1);
      loadJsonFileMock.mockRejectedValueOnce(
        new SyntaxError('Unexpected end of JSON input'),
      );

      await expect(projectDeclaresEmulsifyCore(projectRoot)).resolves.toBe(
        false,
      );
    });

    it('returns false when package.json cannot be read', async () => {
      expect.assertions(1);
      loadJsonFileMock.mockRejectedValueOnce(
        Object.assign(new Error('permission denied'), { code: 'EACCES' }),
      );

      await expect(projectDeclaresEmulsifyCore(projectRoot)).resolves.toBe(
        false,
      );
    });
  });
});
