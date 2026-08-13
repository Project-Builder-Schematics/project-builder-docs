---
title: CLI Commands
description: The complete catalog of builder CLI commands, their arguments, flags, and usage examples.
sidebar:
  order: 1
---

The `builder` binary is the user-facing entry point of Project Builder: it parses commands, validates input, and orchestrates schematic engines. This page catalogs every registered command. If you have not installed the CLI yet, start with the [installation guide](/getting-started/installation/).

Run `builder --help` for the top-level listing, or `builder <command> --help` for command-specific usage. `builder --version` prints the binary version.

## Command summary

| Command | Aliases | Status | Purpose |
|---|---|---|---|
| [`builder init`](#builder-init) | — | Available | Initialise a Project Builder workspace in the current repository |
| [`builder execute`](#builder-execute) | `e`, `g`, `generate` | Available | Execute a schematic against an existing project workspace |
| [`builder new schematic`](#builder-new-schematic) | `s` | Available | Create a new schematic in the workspace |
| [`builder new collection`](#builder-new-collection) | `c` | Available | Create a new collection in the workspace |
| [`builder info`](#builder-info) | — | Available | Inspect the project's registered collections and schematics |
| [`builder add`](#not-yet-implemented-commands) | — | Not implemented | Add a new artefact to an existing project workspace |
| [`builder remove`](#not-yet-implemented-commands) | — | Not implemented | Remove a generated artefact from the project workspace |
| [`builder sync`](#not-yet-implemented-commands) | — | Not implemented | Reconcile a project workspace against its schematic collection |
| [`builder validate`](#not-yet-implemented-commands) | — | Not implemented | Validate the project workspace against its schematic constraints |
| [`builder skill update`](#not-yet-implemented-commands) | — | Not implemented | Update registered skills and extensions to their latest versions |

## Global flags

These persistent flags are accepted by every command:

| Flag | Values | Effect |
|---|---|---|
| `--output` | `pretty`, `json` | Output format: `pretty` (human-readable) or `json` (NDJSON for CI/pipes). Default: auto-detect from terminal. |
| `--theme` | `light`, `dark`, `auto` | Terminal color scheme. Default `auto` — resolved from the `BUILDER_THEME` environment variable or terminal detection. |
| `--verbose` | boolean | Print full diagnostic output (sanitised) for subprocess/engine failures and enable debug-level log lines — text mode only. |
| `--help` | boolean | Show help for the command. |
| `--version` | boolean | Print the CLI version (root command only). |

Boolean flag conventions: `--flag` means `true`, `--no-flag` means `false`, and `--flag=value` sets the explicit value.

See [CLI output and errors](/reference/cli-output-and-errors/) for how `--output`, `--theme`, and `--verbose` shape what the CLI prints, and for the exit-code contract.

---

## `builder init`

Bootstraps a Project Builder workspace in an existing repository. CLI-only — it does not call any schematic engine.

### Synopsis

```sh
builder init [directory] [flags]
```

`directory` is optional. When omitted, `init` operates on the current working directory. The chosen directory is taken literally — `init` does **not** climb the filesystem looking for `.git` or `package.json`.

### What it does

A successful `init` produces:

1. **`project-builder.json`** at the project root — the workspace anchor file (schema v1, `$schema` pointed at the locally-installed SDK package).
2. **`schematics/.gitkeep`** — skeleton folder for local schematic authoring (later filled in by `builder new schematic`).
3. **`.claude/skills/pbuilder/`** — bundled AI skill artefact set: `SKILL.md` (router) plus `use.md`, `choose.md`, `create.md`.
4. **A fenced reference block in `AGENTS.md`** (preferred) or `CLAUDE.md` — idempotent and line-exact.
5. **`@pbuilder/sdk` added to `devDependencies`** in `package.json` — additive merge; existing dependencies are preserved.

After the writes, `init` optionally invokes your detected package manager to install the SDK (with a 120-second timeout). Then, in an interactive terminal, it prompts for MCP server setup; an affirmative reply prints setup instructions.

### Flags

| Flag | Effect |
|---|---|
| `--force` | Re-run on an existing project: `project-builder.json` is read-merged (`collections`, `dependencies`, `settings`, and unknown keys preserved), while the skill artefact set and marker block are regenerated. |
| `--dry-run` | Preview every planned operation without writing any files. See the [dry-run guide](/guides/dry-run/). |
| `--json` | Emit machine-readable JSON output (NDJSON). Combines with `--dry-run` for a full structured plan. |
| `--non-interactive` | Disable all prompts (suitable for CI and AI agents). With `--mcp` unset, defaults to `--mcp=no`. |
| `--package-manager=<npm\|pnpm\|yarn\|bun>` | Override package-manager detection. Default: lockfile sniff (pnpm > yarn > bun > npm) with `npm` as fallback. |
| `--no-install` | Skip the package-manager install step. The SDK is still declared in `package.json` — run the install manually later. |
| `--no-skill` | Atomically skip the skill artefact set, the AGENTS/CLAUDE reference block, and the SDK dev-dependency. Use when you want only `project-builder.json` + `schematics/`. |
| `--mcp=<yes\|no\|prompt>` | Control the MCP setup prompt. Default: `prompt` in a TTY, `no` under `--non-interactive`. `--mcp=prompt` is incompatible with `--non-interactive`. |
| `--publishable` | Reserved — currently returns the `init_not_implemented` error. |

### Examples

```sh
# Standard init — project-builder.json + schematics/ + skill artefact set +
# AGENTS/CLAUDE marker + npm install + prompt for MCP setup
builder init

# Init a sibling directory
builder init ./my-new-workspace

# Preview the full plan as JSON (no writes, no subprocess)
builder init --dry-run --json /tmp/preview

# CI / AI agent flow — non-interactive, JSON output, explicit PM, no MCP
builder init --non-interactive --json --package-manager=pnpm --mcp=no .

# Skip install (you'll run it manually later)
builder init --no-install

# Minimal init — only project-builder.json + schematics/ (no SKILL, no SDK)
builder init --no-skill

# Force re-init over an existing workspace
builder init --force
```

---

## `builder execute`

Runs a named schematic against a project workspace. Aliases: `e`, `g`, `generate`.

### Synopsis

```sh
builder execute <collection>:<schematic> [schematic flags]
```

Provide the schematic as `<collection>:<schematic>` (for example `@schematics/angular:component`). The collection must be registered in `project-builder.json` (created by `builder init`).

### What it does

`execute` validates the workspace (`project-builder.json` must exist), resolves the collection and schematic across all registration shapes, validates your inputs against the schematic's `schema.json`, and then runs the schematic through the engine, streaming its events to the terminal.

### Passing inputs to the schematic

Everything **after** the `<collection>:<schematic>` positional argument is treated as a raw schematic flag, not a CLI flag. Global flags such as `--output` and `--theme` must therefore be placed **before** the positional argument.

Schematic flag tokens follow these rules:

- `--name=value` — string input; the value is kept verbatim (an `=` inside the value is not re-split).
- `--name` — boolean input set to `true`.
- `--no-name` — boolean input set to `false`.
- Tokens that do not start with `--` (bare words, single-dash flags) are skipped with a warning.
- Duplicate flag names are preserved in order, with a warning.

### Flags

| Flag | Effect |
|---|---|
| `--commit=<never\|always>` | Write mode. Default `always`. `ask` is accepted syntactically but rejected — reserved for a future release. |
| `--dry-run` | Alias for `--commit=never`. Setting `--dry-run` together with a disagreeing `--commit` value is an error. |
| `--non-interactive` | Reserved — not yet implemented; emits a warning if set. |
| `--strict` | Reserved — not yet implemented; emits a warning if set. |
| `--force` | Reserved — not yet implemented; emits a warning if set. |
| `--auto-install` | Reserved — not yet implemented; emits a warning if set. |

**Current limitation:** no engine honours `--commit=never` yet. The mode is resolved and carried to the engine, which still writes — the CLI emits a warning whenever the resolved mode is not `always`, so a `--dry-run` invocation is never silently mistaken for a safe preview.

### Examples

```sh
# Run a schematic from the default collection with a string input
builder execute default:my-component --name=button

# Alias form, boolean and negated inputs
builder g default:my-component --standalone --no-tests

# Global flags go BEFORE the positional; schematic flags go after
builder --output=json execute default:my-component --name=button

# Request a no-write run (currently still writes — a warning is emitted)
builder execute default:my-component --dry-run
```

---

## `builder new schematic`

Scaffolds a new schematic with factory and schema files. Alias: `s`. Operates on the workspace anchored by `project-builder.json`. CLI-only — does not call any engine.

### Synopsis

```sh
builder new schematic <name> [flags]
builder new s <name> [flags]
```

`<name>` is mandatory and validated against shell metacharacters, path separators, null bytes, and reserved characters.

### What it does

Two modes, controlled by `--inline`.

**Path mode (default)** — produces 4 outputs:

1. `schematics/<name>/factory.{ts,js}` — factory stub (TypeScript or JavaScript depending on language detection). The stub is a default export: path-mode execute resolves `factory.{ts,js}#default` by convention.
2. `schematics/<name>/schema.json` — canonical v1 shape `{"properties": {}, "description": ""}`.
3. `schematics/<name>/schema.generated.ts` — auto-generated TypeScript interface from `schema.json`'s `properties` (regardless of `--language`). Skipped with a warning when `@pbuilder/sdk` is absent from the workspace.
4. `project-builder.json` — adds `collections.default.<name>: { "path": "./schematics/<name>" }`.

**Inline mode (`--inline`)** — embeds the schematic directly inside `project-builder.json` under `collections.default.schematics.<name>`; no `schematics/<name>/` files are created. Soft warnings fire when a collection accumulates 10 or more inline schematics, or when `project-builder.json` exceeds 20KB after the write.

Type generation is delegated to `pbuilder-codegen`, a binary shipped inside `@pbuilder/sdk`. When the SDK is not installed, the automatic codegen step skips with a warning rather than failing the scaffold (`schema.generated.ts` is left stale or absent).

### Flags

| Flag | Effect |
|---|---|
| `--force` | Overwrite an existing schematic of the same name. |
| `--dry-run` | Preview planned operations without writing any files. |
| `--inline` | Embed the schematic definition in `project-builder.json` instead of creating standalone files. |
| `--language=<ts\|js>` | Force TypeScript or JavaScript factory. Auto-detect default: TS if `devDependencies.typescript` or `tsconfig.json` exists; falls back to TS with a warning otherwise. |
| `--extends=<@scope/pkg:base>` | Declare a base schematic this one extends. Grammar enforced (`@scope/pkg:collection`); path traversal rejected. |

### Examples

```sh
# Standard schematic — 3 files + project-builder.json entry, TS auto-detected
builder new schematic my-component

# Schematic with explicit JavaScript factory
builder new s my-helper --language=js

# Inline schematic — no files, embedded in project-builder.json
builder new schematic config-only --inline

# Schematic that extends an external base (no network call at create-time)
builder new schematic feature-flags --extends=@my-org/core:base

# Preview as JSON without writing anything
builder new schematic preview-test --dry-run --output=json

# Force overwrite an existing schematic
builder new schematic my-component --force
```

For a guided walkthrough, see [your first schematic](/getting-started/your-first-schematic/).

---

## `builder new collection`

Scaffolds a new schematic collection with a skeleton `collection.json`. Alias: `c`.

### Synopsis

```sh
builder new collection <name> [flags]
builder new c <name> [flags]
```

### What it does

**Default mode** — produces 2 outputs:

1. `schematics/<name>/collection.json` — skeleton `{"version": 1, "schematics": {}}`.
2. `project-builder.json` — adds `collections.<name>: { "path": "./schematics/<name>/collection.json" }`.

**Publishable mode (`--publishable`)** — produces the collection skeleton plus `add/` and `remove/` lifecycle stubs (each with `factory.ts`, `schema.json`, and `schema.generated.ts`), turning the collection into a publishable npm package skeleton.

### Flags

| Flag | Effect |
|---|---|
| `--force` | Overwrite an existing collection of the same name. |
| `--dry-run` | Preview planned operations without writing any files. |
| `--publishable` | Generate `add/` and `remove/` lifecycle stubs. |
| `--inline` | Embed the collection definition inline. Conflicts with `--publishable` — combining them is a mode-conflict error. |

### Examples

```sh
# Plain collection — collection.json + project-builder.json entry only
builder new collection ui-kit

# Publishable collection — adds add/remove lifecycle stubs
builder new collection my-pkg --publishable

# Collection alias
builder new c shared-utils --publishable
```

---

## `builder info`

Inspects the current project workspace's registered collections and schematics, across all three registration shapes (path-mode, collection-mode, inline-mode).

### Synopsis

```sh
builder info [<collection>[:<schematic>]]
```

### What it does

The single optional argument selects one of three forms:

| Form | Result |
|---|---|
| `builder info` | List registered collections |
| `builder info <collection>` | List a collection's schematics |
| `builder info <collection>:<schematic>` | Show a schematic's full input detail |

`info` has no local flags. Pass the global `--output=json` for machine-readable output.

### Examples

```sh
# List every collection registered in project-builder.json
builder info

# List the schematics inside the default collection
builder info default

# Show a schematic's inputs (name, type, required, default, ...)
builder info default:my-component

# Machine-readable variant
builder info default:my-component --output=json
```

---

## Not-yet-implemented commands

The following commands are registered in the binary and appear in `builder --help`, but their handlers are stubs: invoking them exits with code 1 and the `not_implemented` error ("command not yet implemented").

| Command | Planned purpose |
|---|---|
| `builder add` | Generate a new artefact (component, module, service) within an existing project workspace by running a schematic. Inputs are validated against its JSON schema before any file changes occur. |
| `builder remove` | Delete a generated artefact from the project workspace by reversing the file changes produced by a prior `add`. Only artefacts tracked in the workspace manifest can be removed. |
| `builder sync` | Reconcile an existing project workspace against its schematic collection, applying upstream updates without losing local customisations. |
| `builder validate` | Check that the current project workspace conforms to its schematic collection's constraints, file layout rules, and schema definitions; exits non-zero if violations are found. |
| `builder skill update` | Upgrade the registered schematic skills and extensions in the current project workspace to their latest published versions. |

`builder skill` itself is a command group: invoked with no sub-command it prints its help and exits 0.
