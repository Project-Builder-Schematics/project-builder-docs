---
title: project-builder.json
description: Every key of the workspace configuration file builder init writes, what the CLI reads from it, and the JSON schema editors use to validate it.
sidebar:
  order: 4
---

`project-builder.json` sits at the project root and anchors the workspace. `builder init` writes it; `builder execute` and `builder new schematic` read it.

## Editor validation

`builder init` writes a `$schema` pointer to the schema that `@pbuilder/sdk` ships:

```json
{
  "$schema": "./node_modules/@pbuilder/sdk/schemas/project-builder.schema.json"
}
```

Once `@pbuilder/sdk` is installed, editors with JSON schema support (VS Code, JetBrains IDEs, and any editor running a JSON language server) validate the file and autocomplete its keys. The schema ships with `@pbuilder/sdk` `0.5.0` and later. With an [external SDK root](/reference/cli-commands/#external-sdk-root-sdkroot), `node_modules/@pbuilder/sdk` is a link to that root, so the same path still resolves.

## Example

```json title="project-builder.json"
{
  "$schema": "./node_modules/@pbuilder/sdk/schemas/project-builder.schema.json",
  "version": "1",
  "collections": {
    "widgets": { "path": "./libs/widgets/collection.json" },
    "default": {
      "api-endpoint": { "path": "./schematics/api-endpoint" }
    }
  },
  "dependencies": {},
  "settings": {
    "autoInstall": true,
    "conflictPolicy": "child-wins",
    "depValidation": "dev",
    "schematicCollections": ["default"]
  },
  "skill": { "enabled": true, "path": ".claude/skills/pbuilder/SKILL.md" },
  "sdk": { "version": "0.5.0" }
}
```

## Top-level keys

| Key | Type | Written by `init` | Purpose |
|---|---|---|---|
| `$schema` | string | the path above | Points editors at the schema. The CLI does not read it. |
| `version` | string | `"1"` | Config format version. |
| `collections` | object | `{}` | Collections by name. See [`collections`](#collections). |
| `dependencies` | object | `{}` | Package names mapped to semver ranges. The CLI does not read it: SDK selection uses `package.json` and [`sdk.version`](#sdk). |
| `settings` | object | the defaults below | See [`settings`](#settings). |
| `skill` | object | `{ "enabled": true, "path": ".claude/skills/pbuilder/SKILL.md" }` | The agent skill `init` installs. `enabled` is `false` after `init --no-skill`. |
| `sdk` | object | not written | See [`sdk`](#sdk). |

Keys the CLI does not know are kept as they are, including on `init --force`, so you can store your own data at the top level.

## `collections`

Each entry under `collections` takes one of two shapes.

In collection mode, the entry points at a `collection.json`:

```json
{
  "collections": {
    "widgets": { "path": "./libs/widgets/collection.json" }
  }
}
```

An entry with a `path` string is always read as collection mode.

A schematic container maps schematic names to their directories. `builder new schematic` writes this shape into `default`:

```json
{
  "collections": {
    "default": {
      "api-endpoint": { "path": "./schematics/api-endpoint" }
    }
  }
}
```

Inside a schematic container, the key `schematics` is reserved for inline registrations (`{ "schematics": { "<name>": { "factory": "<module>#<export>" } } }`). `builder execute` rejects a schematic registered only inline with `execute_unsupported_registration`, and a name registered both ways with `execute_ambiguous_registration`. See [CLI output and errors](/reference/cli-output-and-errors/).

All paths are relative to the workspace and must stay inside it.

## `settings`

| Key | Type | Default | Values |
|---|---|---|---|
| `autoInstall` | boolean | `true` | |
| `conflictPolicy` | string | `"child-wins"` | `child-wins`, `strict` |
| `depValidation` | string | `"dev"` | `dev`, `strict` |
| `schematicCollections` | string[] | `["default"]` | Collection names, in order |

`schematicCollections` is the ordered list of collections searched for a schematic given without a collection, and its first entry is the collection `builder new schematic` writes to. An absent or empty list means `["default"]`.

The CLI does not act on `autoInstall`, `conflictPolicy` or `depValidation` yet, and it does not check their values. The schema lists the documented values so editors can flag a typo.

A missing or `null` `settings` means all defaults. Unknown keys inside `settings` are dropped when `init --force` rewrites the file.

## `sdk`

| Key | Type | Purpose |
|---|---|---|
| `version` | string | Minimum `@pbuilder/sdk` version, used when `package.json` declares none. See [SDK requirement](/reference/cli-commands/#sdk-requirement). |
| `root` | string | Absolute or config-relative path to an external `@pbuilder/sdk` package directory. See [External SDK root](/reference/cli-commands/#external-sdk-root-sdkroot). |

Both keys are optional and independent. `init` never writes `sdk`.

## `init --force`

Re-running `builder init --force` on an existing workspace rewrites the file:

- `$schema`, `version` and `skill` are reset to the values `init` writes.
- `collections`, `dependencies` and `settings` keep your values.
- `sdk` and every unknown top-level key are kept as they are.
- Unknown keys inside `settings` are dropped.
