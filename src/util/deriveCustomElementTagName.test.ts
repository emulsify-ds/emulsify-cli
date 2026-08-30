import {
  assertValidCustomElementTagName,
  deriveCustomElementTagName,
} from './deriveCustomElementTagName.js';

describe('deriveCustomElementTagName', () => {
  it('preserves a hyphenated component filename', () => {
    expect.assertions(1);

    expect(deriveCustomElementTagName('featured-item', 'acme-theme')).toBe(
      'featured-item',
    );
  });

  it('namespaces a single-word filename with the project machine name', () => {
    expect.assertions(1);

    expect(deriveCustomElementTagName('card', 'acme-theme')).toBe(
      'acme-theme-card',
    );
  });
});

describe('assertValidCustomElementTagName', () => {
  it.each(['featured-item', 'acme-theme-card', 'emotion-😍'])(
    'accepts valid custom-element tag %p',
    (tagName) => {
      expect.assertions(1);

      expect(() => assertValidCustomElementTagName(tagName)).not.toThrow();
    },
  );

  it.each([
    null,
    'Example-card',
    '123-card',
    'examplecard',
    '-example-card',
    'example card',
    'example/card',
    'example-:',
    'annotation-xml',
    'color-profile',
    'font-face',
    'font-face-src',
    'font-face-uri',
    'font-face-format',
    'font-face-name',
    'missing-glyph',
  ])('rejects invalid custom-element tag %p', (tagName) => {
    expect.assertions(1);

    expect(() => assertValidCustomElementTagName(tagName)).toThrow(
      /Invalid custom element tag name.*ASCII lowercase letter.*hyphen.*browser-supported.*reserved name/u,
    );
  });
});
