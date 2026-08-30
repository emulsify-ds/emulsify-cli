# Component Template Overrides

Run `emulsify component eject-templates` from an Emulsify project to see and
edit the exact templates used by `component create`:

```bash
emulsify component eject-templates
```

In an interactive terminal, the command lets you select one or more component
types. To eject one type directly, including from a script or CI job, provide
its canonical type:

```bash
emulsify component eject-templates twig
emulsify component eject-templates twig-sdc
emulsify component eject-templates react
emulsify component eject-templates web-component
```

The command writes the selected defaults beneath
`.cli/templates/<type>/` and reports each real destination path. It adds no
generated header or other content, so rendering a freshly ejected template is
byte-for-byte identical to using the corresponding built-in template.

## Protecting Existing Overrides

Before writing, the CLI checks the complete selected set. If any target already
exists, it lists every conflict and writes nothing. This protects customized
templates from partial replacement.

Use `--force` only when all conflicting files in the selected set may be
replaced:

```bash
emulsify component eject-templates twig --force
```

Use `--dry-run` to inspect the destinations and conflicts without creating or
changing files:

```bash
emulsify component eject-templates react --dry-run
```

When standard input is not a TTY, `[type]` is required. The CLI exits with an
actionable error instead of opening a prompt.

## How Overrides Are Resolved

Overrides replace known generated artifacts one-for-one. They do not add
arbitrary files or change the artifact set generated for a component type.

The canonical directory names match the `--type` values: `twig`, `twig-sdc`,
`react`, and `web-component`. `eject-templates` always writes to these canonical
directories.

Existing Twig directory aliases continue to work. For each Twig artifact, the
CLI checks `.cli/templates/twig/` first and then `.cli/templates/default/`. For
each Twig SDC artifact, it checks `.cli/templates/twig-sdc/` and then
`.cli/templates/sdc/`. Alias fallback is resolved one artifact at a time, so a
partial canonical override does not hide legacy overrides for other artifacts.
React and Web Component overrides have no legacy aliases.

When no override is available, `component create` uses its built-in template.
An override file that exists but is empty is ignored in favor of the built-in
and produces a warning. Deleting an override restores this normal fallback
sequence: a legacy alias where applicable, then the built-in.

Ejecting a type creates its complete current template set. If only one artifact
needs customization, delete the other ejected files so those artifacts continue
to inherit built-in changes from future CLI releases.

## Supported Tokens

Override files can use double-brace tokens.

| Token                  | Example Value For `featured-item`                                            |
| ---------------------- | ---------------------------------------------------------------------------- |
| `{{ filename }}`       | `featured-item`                                                              |
| `{{ className }}`      | `featured-item`                                                              |
| `{{ camelName }}`      | `featuredItem`                                                               |
| `{{ pascalName }}`     | `FeaturedItem`                                                               |
| `{{ snakeName }}`      | `featured_item`                                                              |
| `{{ humanName }}`      | `Featured Item`                                                              |
| `{{ directory }}`      | `base`                                                                       |
| `{{ directoryTitle }}` | `Base`                                                                       |
| `{{ type }}`           | `twig`, `twig-sdc`, `react`, or `web-component`                              |
| `{{ tagName }}`        | `featured-item` for a Web Component; an empty string for every other type    |
| `{{ format }}`         | `default` for Twig, `sdc` for Twig SDC, otherwise `react` or `web-component` |
| `{{ formatLabel }}`    | `STANDARD`, `SDC`, `REACT`, or `WEB COMPONENT`                               |

`{{ type }}` is the canonical token for new overrides. `{{ format }}` remains
populated so existing Twig and Twig SDC overrides keep their previous values
after migrating from `--format` to `--type`. `{{ formatLabel }}` contains the
display label used in generated file headers. `{{ directoryTitle }}` contains
the structure name with its first character capitalized for Storybook titles.

Whitespace inside the braces is optional:

```twig
{{humanName}}
{{ humanName }}
```

Unknown tokens are left unchanged and logged as warnings.

## Customize An Ejected Template

First eject the defaults for the component type:

```bash
emulsify component eject-templates twig
```

Edit `.cli/templates/twig/component.twig`, then generate a component normally:

```bash
emulsify component create featured-item --directory base --type twig
```

The edited template produces:

```text
components/00-base/featured-item/featured-item.twig
```

Only that project uses the override. Other projects and component types
continue using their own overrides or the CLI's built-ins.

## Preview Component Creation

After editing an override, use `component create --dry-run` to confirm the
selected type, structure, and output paths without writing component files:

```bash
emulsify component create featured-item --directory base --type twig --dry-run
```
