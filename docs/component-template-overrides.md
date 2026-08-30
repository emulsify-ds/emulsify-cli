# Component Template Overrides

`emulsify component create` uses built-in templates by default. A project can replace any generated artifact with a matching override file under `.cli/templates/`.

Overrides replace known generated files one-for-one. They do not add arbitrary extra files and they do not change which artifacts are generated.

## Directory Layout

Twig overrides:

```text
.cli/templates/twig/component.twig
.cli/templates/twig/component.scss
.cli/templates/twig/component.yml
.cli/templates/twig/component.stories.js
```

Twig SDC overrides:

```text
.cli/templates/twig-sdc/component.twig
.cli/templates/twig-sdc/component.scss
.cli/templates/twig-sdc/component.component.yml
.cli/templates/twig-sdc/component.js
.cli/templates/twig-sdc/component.stories.js
```

React overrides:

```text
.cli/templates/react/component.jsx
.cli/templates/react/component.scss
.cli/templates/react/component.stories.jsx
```

Web Component overrides:

```text
.cli/templates/web-component/component.js
.cli/templates/web-component/component.scss
.cli/templates/web-component/component.stories.js
```

The directory name follows the canonical component `--type` value.

### Legacy Twig Directory Aliases

Existing override directories continue to work. For each Twig artifact, the
CLI looks in `.cli/templates/twig/` first and, when that artifact is absent,
looks in `.cli/templates/default/`. For each Twig SDC artifact, it looks in
`.cli/templates/twig-sdc/` first and, when absent, in
`.cli/templates/sdc/`. If neither path contains the artifact, the built-in
template is used. An override file that exists but is empty is ignored in favor
of the built-in template and produces a warning.

This precedence applies one artifact at a time, so a partial canonical override
does not disable legacy overrides for the remaining files. `default/` and
`sdc/` are compatibility aliases; use `twig/` and `twig-sdc/` for new
customizations. React and Web Component overrides have no legacy aliases.

## Supported Tokens

Override files can use double-brace tokens.

| Token              | Example Value For `featured-item`                                            |
| ------------------ | ---------------------------------------------------------------------------- |
| `{{ filename }}`   | `featured-item`                                                              |
| `{{ className }}`  | `featured-item`                                                              |
| `{{ camelName }}`  | `featuredItem`                                                               |
| `{{ pascalName }}` | `FeaturedItem`                                                               |
| `{{ snakeName }}`  | `featured_item`                                                              |
| `{{ humanName }}`  | `Featured Item`                                                              |
| `{{ directory }}`  | `base`                                                                       |
| `{{ type }}`       | `twig`, `twig-sdc`, `react`, or `web-component`                              |
| `{{ tagName }}`    | `featured-item` for a Web Component; an empty string for every other type    |
| `{{ format }}`     | `default` for Twig, `sdc` for Twig SDC, otherwise `react` or `web-component` |

`{{ type }}` is the canonical token for new overrides. `{{ format }}` remains
populated so existing Twig and Twig SDC overrides keep rendering the same
values after migrating from `--format` to `--type`.

Whitespace inside the braces is optional:

```twig
{{humanName}}
{{ humanName }}
```

Unknown tokens are left unchanged and logged as warnings. Empty override files are ignored and the built-in template is used.

## Example Twig Override

Create `.cli/templates/twig/component.twig`:

```twig
{% set classes = [
  '{{ className }}',
] %}

<section class="{{ className }}" data-component="{{ filename }}">
  {% block content %}
  {% endblock %}
</section>
```

Then generate a component:

```bash
emulsify component create featured-item --directory base --type twig
```

The generated file is:

```text
components/00-base/featured-item/featured-item.twig
```

## Example SDC Metadata Override

Create `.cli/templates/twig-sdc/component.component.yml`:

```yaml
name: {{ humanName }}
status: stable
props:
  type: object
  properties:
    {{ snakeName }}_title:
      type: string
      title: Title
slots:
  content:
    title: Content
```

Generate the SDC component:

```bash
emulsify component create featured-item --directory base --type twig-sdc
```

The generated file is:

```text
components/00-base/featured-item/featured-item.component.yml
```

## Partial Overrides

Override only the artifacts you need. For example, a project can override Twig and keep the built-in SCSS, data, and story templates:

```text
.cli/templates/twig/component.twig
```

All missing override files fall through the legacy directory alias, where one
exists, and then to the built-in builders.

## Dry-Run With Overrides

Dry runs do not write files, but they still resolve the selected type,
structure, and output paths:

```bash
emulsify component create featured-item --directory base --type twig --dry-run
```

Use dry runs to confirm the component destination before replacing or adding override files.
