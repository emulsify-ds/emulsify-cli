/**
 * @file Builds autonomous web component templates.
 */

/**
 * Generates an autonomous custom element registered under a validated tag.
 *
 * @param pascalName PascalCase JavaScript component identifier.
 * @param filename Kebab-case component file and folder name.
 * @param className CSS base class name used by the component markup.
 * @param humanName Human-readable component name used in default content.
 * @param tagName Valid autonomous custom-element tag name.
 * @returns JavaScript source content for the generated web component.
 */
export function buildWebComponentTemplate(
  pascalName: string,
  filename: string,
  className: string,
  humanName: string,
  tagName: string,
): string {
  return `/**
 * @file
 * ${filename}.js
 */

export class ${pascalName}Element extends HTMLElement {
  set heading(value) {
    this.headingValue = value;
    this.render();
  }

  get heading() {
    return this.headingValue;
  }

  set content(value) {
    this.contentValue = value;
    this.render();
  }

  get content() {
    return this.contentValue;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const heading = this.headingValue ?? '${humanName} Component';
    const content =
      this.contentValue ??
      'This is the content area of the ${humanName} web component. Replace it with your markup and data.';

    this.innerHTML = \`
      <article class="${className}">
        \${heading ? \`<h2 class="${className}__heading">\${heading}</h2>\` : ''}
        <div class="${className}__content">\${content}</div>
      </article>
    \`;
  }
}

if (!customElements.get('${tagName}')) {
  customElements.define('${tagName}', ${pascalName}Element);
}
`;
}
