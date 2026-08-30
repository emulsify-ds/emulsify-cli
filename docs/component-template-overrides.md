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

Canonical directories use the collision-free token syntax documented below.
The `default/` and `sdc/` aliases retain the v2.3 double-brace token syntax for
backward compatibility. Move an older override into its canonical directory
and update its tokens when convenient; this prevents CLI placeholders from
overlapping with ordinary Twig variables.

When no override is available, `component create` uses its built-in template.
An override file that exists but is empty is ignored in favor of the built-in
and produces a warning. Deleting an override restores this normal fallback
sequence: a legacy alias where applicable, then the built-in.

Ejecting a type creates its complete current template set. If only one artifact
needs customization, delete the other ejected files so those artifacts continue
to inherit built-in changes from future CLI releases.

## Supported Tokens

Canonical override files use namespaced placeholders. Their delimiter is
intentionally different from Twig's `{{ variable }}` syntax, so ordinary Twig
variables are never rewritten by the CLI.

| Token                         | Example Value For `featured-item`                                            |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `__EMULSIFY_filename__`       | `featured-item`                                                              |
| `__EMULSIFY_className__`      | `featured-item`                                                              |
| `__EMULSIFY_camelName__`      | `featuredItem`                                                               |
| `__EMULSIFY_pascalName__`     | `FeaturedItem`                                                               |
| `__EMULSIFY_snakeName__`      | `featured_item`                                                              |
| `__EMULSIFY_humanName__`      | `Featured Item`                                                              |
| `__EMULSIFY_directory__`      | `base`                                                                       |
| `__EMULSIFY_directoryTitle__` | `Base`                                                                       |
| `__EMULSIFY_type__`           | `twig`, `twig-sdc`, `react`, or `web-component`                              |
| `__EMULSIFY_tagName__`        | `featured-item` for a Web Component; an empty string for every other type    |
| `__EMULSIFY_format__`         | `default` for Twig, `sdc` for Twig SDC, otherwise `react` or `web-component` |
| `__EMULSIFY_formatLabel__`    | `STANDARD`, `SDC`, `REACT`, or `WEB COMPONENT`                               |

`__EMULSIFY_type__` is the canonical type. `__EMULSIFY_format__` remains
available for compatibility with the deprecated `--format` terminology.
`__EMULSIFY_formatLabel__` contains the display label used in generated file
headers. `__EMULSIFY_directoryTitle__` contains the structure name with its
first character capitalized for Storybook titles.

For example, an override can combine a scaffold-time placeholder with a Twig
variable. Only the namespaced placeholder is replaced:

```twig
<article data-component="__EMULSIFY_filename__">
  {{ type }}
</article>
```

Unknown namespaced placeholders are left unchanged and logged as warnings.
Ordinary Twig expressions are ignored by the CLI renderer.

Legacy overrides in `default/` and `sdc/` continue to recognize the v2.3
double-brace tokens: `filename`, `className`, `camelName`, `snakeName`,
`humanName`, `directory`, and `format`. New 2.4 tokens are not enabled in those
directories, preventing new collisions from being introduced into legacy
files.

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
