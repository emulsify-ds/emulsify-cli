# Component Template Overrides

`emulsify component create` uses built-in templates by default. A project can replace any generated artifact with a matching override file under `.cli/templates/`.

Overrides replace known generated files one-for-one. They do not add arbitrary extra files and they do not change which artifacts are generated.

## Directory Layout

Default component overrides:

```text
.cli/templates/default/component.twig
.cli/templates/default/component.scss
.cli/templates/default/component.yml
.cli/templates/default/component.stories.js
```

SDC component overrides:

```text
.cli/templates/sdc/component.twig
.cli/templates/sdc/component.scss
.cli/templates/sdc/component.component.yml
.cli/templates/sdc/component.js
.cli/templates/sdc/component.stories.js
```

For each generated artifact, the CLI looks for the matching override first. If the file is missing, the built-in template is used.

## Supported Tokens

Override files can use double-brace tokens.

| Token             | Example Value For `featured-item` |
| ----------------- | --------------------------------- |
| `{{ filename }}`  | `featured-item`                   |
| `{{ className }}` | `featured-item`                   |
| `{{ camelName }}` | `featuredItem`                    |
| `{{ snakeName }}` | `featured_item`                   |
| `{{ humanName }}` | `Featured Item`                   |
| `{{ directory }}` | `base`                            |
| `{{ format }}`    | `default` or `sdc`                |

Whitespace inside the braces is optional:

```twig
{{humanName}}
{{ humanName }}
```

Unknown tokens are left unchanged and logged as warnings. Empty override files are ignored and the built-in template is used.

## Example Default Twig Override

Create `.cli/templates/default/component.twig`:

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
emulsify component create featured-item --directory base --format default
```

The generated file is:

```text
components/00-base/featured-item/featured-item.twig
```

## Example SDC Metadata Override

Create `.cli/templates/sdc/component.component.yml`:

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
emulsify component create featured-item --directory base --format sdc
```

The generated file is:

```text
components/00-base/featured-item/featured-item.component.yml
```

## Partial Overrides

Override only the artifacts you need. For example, a project can override Twig and keep the built-in SCSS, data, and story templates:

```text
.cli/templates/default/component.twig
```

All missing override files fall back to the built-in builders.

## Dry-Run With Overrides

Dry runs do not write files, but they still resolve the selected format, structure, and output paths:

```bash
emulsify component create featured-item --directory base --format default --dry-run
```

Use dry runs to confirm the component destination before replacing or adding override files.
