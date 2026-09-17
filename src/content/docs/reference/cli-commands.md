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
5. **`package.json` setup** — `devDependencies["@pbuilder/sdk"]` and a `scripts["generate:types"]` entry, each added only when its key is missing. See [`package.json` edits](#packagejson-edits).

After the writes, `init` invokes your detected package manager to install the SDK (with a 120-second timeout), unless `--no-install`, `--no-sdk-dependency` or `--no-skill` is set. Then, in an interactive terminal, it prompts for MCP server setup; an affirmative reply prints setup instructions.

The outputs are written in the order above. If a later step fails, earlier outputs stay on disk — there is no whole-init rollback. Fix the cause and re-run with `--force`.

### `package.json` edits

`init` adds two entries to `package.json`:

| Entry | Value |
|---|---|
| `devDependencies["@pbuilder/sdk"]` | `>=0.1.0` |
| `scripts["generate:types"]` | A shell loop that runs `pbuilder-codegen` once for every `schema.json` under `schematics/`, skipping `files/` template trees |

The edit is additive and lossless:

- **Only missing keys are added.** An SDK version you already pinned, or your own `generate:types` script, is never overwritten.
- **Existing bytes are kept.** New entries are inserted into the file as it is — indentation, tabs, CRLF line endings and key order elsewhere stay untouched, and the inserted lines follow the surrounding style. When `package.json` does not exist, `init` creates a minimal one.
- **Nothing to add means identical content.** When both entries already exist, the file content stays byte-identical. `init` still writes the file, so do not rely on it being untouched on disk (for example, its modification time).
- **With no entry requested, `package.json` is not touched at all.** Under `--no-sdk-dependency` (with its inherited `--skip-types-script`) or `--no-skill`, `init` does not read, create or write it.

`init` validates the fields it is about to edit:

- A `devDependencies` or `scripts` field that is present but is not an object of strings — including `"scripts": null` — is invalid, not an empty map. `init` stops with [`invalid_input`](/reference/cli-output-and-errors/#builder-init) (`package.json scripts field is not a valid string map`) and leaves `package.json` unchanged. Repair the field and re-run. Each field is checked only when its entry is requested.
- A `package.json` that is not valid JSON fails the same way.
- A document whose root is `null` is treated as an empty object.

These guarantees cover the CLI's own edit. The install step that follows — and any install you run later — is your package manager's, and it can rewrite `package.json` and the lockfile itself. Use `--no-install` to separate the two.

### Flags

| Flag | Effect |
|---|---|
| `--force` | Re-run on an existing project: `project-builder.json` is read-merged (`collections`, `dependencies`, `settings`, and unknown keys preserved), while the skill artefact set and marker block are regenerated. |
| `--dry-run` | Preview every planned operation without writing any files. See the [dry-run guide](/guides/dry-run/). |
| `--json` | Emit machine-readable JSON output (NDJSON). Combines with `--dry-run` for a full structured plan. |
| `--non-interactive` | Disable all prompts (suitable for CI and AI agents). With `--mcp` unset, defaults to `--mcp=no`. |
| `--package-manager=<npm\|pnpm\|yarn\|bun>` | Override package-manager detection. Default: lockfile sniff (pnpm > yarn > bun > npm) with `npm` as fallback. |
| `--no-install` | Skip the package-manager install step only. The requested `package.json` entries are still added — run the install manually later. |
| `--no-sdk-dependency` | Do not add `@pbuilder/sdk` to `devDependencies` and do not run the install step. Existing entries are preserved, never removed. Its value is also the default for `--skip-types-script`. See [Evaluate without adopting the SDK](/guides/evaluate-without-sdk/). |
| `--skip-types-script` | Do not add the `generate:types` script. When omitted, it takes the value of `--no-sdk-dependency`; an explicit value, such as `--skip-types-script=false`, always wins. |
| `--no-skill` | Skip the skill artefact set, the AGENTS/CLAUDE reference block, all `package.json` setup, the install step and MCP setup. Use when you want only `project-builder.json` + `schematics/`. |
| `--mcp=<yes\|no\|prompt>` | Control the MCP setup prompt. Default: `prompt` in a TTY, `no` under `--non-interactive`. `--mcp=prompt` is incompatible with `--non-interactive`. |
| `--publishable` | Reserved — currently returns the `init_not_implemented` error. |

### Package setup flags

`--no-sdk-dependency` and `--skip-types-script` decide what `init` asks of `package.json`. The table assumes a real run without `--no-install` or `--no-skill`; "add" means add when the key is missing.

| `--no-sdk-dependency` | `--skip-types-script` | Add `@pbuilder/sdk` | Add `generate:types` | Run install |
|---|---|---|---|---|
| omitted / `false` | omitted / `false` | Yes | Yes | Yes |
| omitted / `false` | `true` | Yes | No | Yes |
| `true` | omitted / `true` | No | No | No |
| `true` | `false` | No | Yes | No |

`--no-sdk-dependency=false` keeps the normal SDK setup, and `--skip-types-script=false` overrides the inherited default. These are two specific `init` flags — not a general rule that one `--no-` flag negates another. `--no-install` removes only the install step from any row, and `--no-skill` skips every column.

When `--no-sdk-dependency` is set, `init` prints a warning with the ways to provide an SDK: use one already at `node_modules/@pbuilder/sdk`, or install it locally with your package manager.

With `--dry-run`, `init` writes nothing and installs nothing:

- It reads the real `package.json` only when an entry is requested, and lists only the entries that are actually missing — for example `Would modify: package.json (generate:types)` — plus the install step when it would run. Invalid fields fail the preview the same way they fail a real run.
- The skill artefact set and the agent marker always appear as planned creates/appends, whatever already exists on disk. Treat them as a plan, not an exact prediction.

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

# Evaluate without declaring the SDK — no SDK entry, no generate:types, no install
builder init --no-sdk-dependency --non-interactive

# Same, but keep a generate:types entry
builder init --no-sdk-dependency --skip-types-script=false --non-interactive

# Adopt the SDK without adding generate:types
builder init --skip-types-script --non-interactive

# Force re-init over an existing workspace
builder init --force
```

---

## `builder execute`

Runs a named schematic against a project workspace. Aliases: `e`, `g`, `generate`.

### Synopsis

```sh
builder execute [CLI flags] <collection>:<schematic> [schematic flags]
```

Provide the schematic as `<collection>:<schematic>` (for example `@schematics/angular:component`). The collection must be registered in `project-builder.json` — the one in the working directory (created by `builder init`), or the one named by [`--manifest`](#external-manifest---manifest).

### What it does

`execute` validates the workspace (`project-builder.json` must exist in the working directory, or in the directory named by `--manifest`), resolves the collection and schematic across all registration shapes, validates your inputs against the schematic's `schema.json`, and then runs the schematic through the engine, streaming its events to the terminal.

### SDK requirement

`execute` runs the schematic against the `@pbuilder/sdk` installed at `node_modules/@pbuilder/sdk` in the workspace, or against an SDK outside the project — see [SDK source](#sdk-source). A declaration in `package.json` does not install anything: the package must be present, complete and readable. Declaring it is not required — see [Evaluate without adopting the SDK](/guides/evaluate-without-sdk/).

Before it inspects the installation, `execute` selects a version requirement from the **first** of these sources that is present:

1. `package.json` → `devDependencies["@pbuilder/sdk"]`
2. `package.json` → `dependencies["@pbuilder/sdk"]`
3. `project-builder.json` → `sdk.version`
4. None present: `0.2.4`, the oldest SDK the CLI is tested against. It is not a guarantee that every newer SDK works.

The requirement is a **numeric floor**, not a semver range: leading operators such as `^`, `~` or `>=` are dropped, and the installed version must be greater than or equal to the number that remains. The `>=0.1.0` entry that `builder init` adds therefore selects a `0.1.0` floor.

The selected value must be valid. An invalid value fails with `sdk_requirement_invalid`, and the CLI does not fall back to a lower-priority source — once a source is selected, the sources below it are not read. See [SDK diagnostics](/reference/cli-output-and-errors/#sdk-diagnostics).

To declare a requirement without adding a dependency, set it in `project-builder.json`:

```json
{
  "sdk": {
    "version": "0.2.4"
  }
}
```

`init` never writes this block, and the top-level `dependencies` key in `project-builder.json` plays no part in SDK selection.

### SDK source

`execute` takes the SDK from the **first** of these sources that is set:

1. [`--sdk-root=<dir>`](#--sdk-root-and-builder_sdk_root)
2. The [`BUILDER_SDK_ROOT`](#--sdk-root-and-builder_sdk_root) environment variable
3. [`sdk.root`](#external-sdk-root-sdkroot) in the working directory's `project-builder.json`
4. The workspace's installed `node_modules/@pbuilder/sdk`

A source that is set but names an unusable directory fails the run: `execute` never falls back to a lower source. The first three name an SDK outside the project and share the same validation, the same link and the same diagnostics, described under `sdk.root` below. The version requirement applies to all four.

### External SDK root (`sdk.root`)

`sdk.root` runs schematics against an `@pbuilder/sdk` that lives outside the project — typically a global install — without installing it into the project or editing `package.json`:

```json title="project-builder.json"
{
  "sdk": {
    "root": "/Users/me/.bun/install/global/node_modules/@pbuilder/sdk"
  }
}
```

**The value.** An absolute path is used as is; a relative path resolves against the directory that holds `project-builder.json`. The path is canonicalised — symbolic links in it are resolved, so on macOS `/tmp/sdk` becomes `/private/tmp/sdk`. Paths with spaces and `..` segments work. The root may live outside the workspace or inside it: its location alone does not make it valid. The value is checked when `execute` or `new schematic` runs, not when the configuration is read.

**What the root must be.** The package directory itself, as a global install lays it out:

| Install | `sdk.root` |
|---|---|
| `bun add -g @pbuilder/sdk` | `~/.bun/install/global/node_modules/@pbuilder/sdk` (expand `~` — write the full path) |
| `npm install -g @pbuilder/sdk` | `<npm root -g>/@pbuilder/sdk` — run `npm root -g` to get the prefix |

Before linking anything, `execute` validates the root:

- **Identity** — its `package.json` name is `@pbuilder/sdk`.
- **Distribution** — `dist/bin/pbuilder-runner.js` and `dist/transport` are present.
- **Version** — the installed version meets the [SDK requirement](#sdk-requirement), selected exactly as for a local install.
- **Dependencies** — the SDK's own runtime dependencies (today `ts-morph`) resolve from a `node_modules` at or above the root. A package-manager cache directory does not qualify.
- **Permissions** — the root is not writable by its group or by other users, no directory above it is world-writable without the sticky bit, and the root and its ancestors are owned by you or by root. A directory above the root that is only **group**-writable does not fail the run: it emits the `warn_sdk_root_group_writable` warning and execution continues.

**The link.** When the run commits, `execute` creates exactly one entry: `node_modules/@pbuilder/sdk` in the workspace, a **symbolic link** to the canonical root. It creates `node_modules/` and `node_modules/@pbuilder/` when they are missing, and writes nothing else. Re-running with the same root reuses the link without writing; naming a different root repoints it. A failed write leaves no partial link. Runs that do not commit — `--dry-run` or `--commit=never` — create nothing; for native schematics they are rejected anyway (see the native engine limitation below).

**A local install wins nothing silently.** If `node_modules/@pbuilder/sdk` is already a real directory, `execute` never overwrites it and never picks one of the two for you: it fails with `execute_sdk_link_path_conflict`. The only exception is a local entry that canonically resolves to the same directory as the configured root — then the run proceeds with no error and no write. Neither installation is ever modified.

**`builder new schematic`** resolves the SDK from `sdk.root` directly, with no prior `execute` and no link. It validates the root the same way — except for the version requirement, which only `execute` enforces. A root that fails any check counts as "no usable SDK": the command still exits `0` and writes the scaffold, warns, and skips `schema.generated.ts`. It never runs anything from a root that failed validation.

**`builder info`** ignores `sdk.root`, valid or not.

**Messages never contain the path.** No error, warning, suggestion or JSON field includes the configured root's filesystem path. Locations are described relative to the root — "the configured root itself", "1 level above sdk.root", "N levels above sdk.root".

**Removing `sdk.root`.** Deleting the key does not remove the link. The next `execute` fails with `execute_manifest_path_escape`, because the leftover link now points outside the workspace. Confirm it is a symlink — never a directory — and delete it:

```sh
test -L node_modules/@pbuilder/sdk && rm node_modules/@pbuilder/sdk
```

**Regenerating types by hand.** No package manager installed anything, so there is no `node_modules/.bin/pbuilder-codegen` shim. See [Type generation with `sdk.root`](/guides/type-generation/#when-the-sdk-comes-from-sdkroot).

Every error code and reason is listed in [SDK diagnostics](/reference/cli-output-and-errors/#sdk-diagnostics).

### `--sdk-root` and `BUILDER_SDK_ROOT`

`--sdk-root=<dir>` names an external SDK root for one run without touching `project-builder.json`. The `BUILDER_SDK_ROOT` environment variable does the same for every run; the flag always wins over it. They name the same directory `sdk.root` does — the `@pbuilder/sdk` package directory — and go through the same validation, the same link and the same diagnostics. See [External collections](/guides/external-collections/#set-up-a-shared-collections-directory) for the setup that uses them.

- **Value.** Absolute, or relative to the **working directory** — not to `project-builder.json`. `~` is not expanded: a shell expands it when you assign the variable (`export` in bash or zsh, `set -x` in fish), but a value quoted in the shell or written into an editor or agent settings file stays literal and fails with `sdk_root_unresolvable`. Write the full path there.
- **Local paths only.** A value that starts with a URL scheme or a drive letter fails with `sdk_root_unsupported_scheme` before the filesystem is touched.
- **Empty values.** An empty `BUILDER_SDK_ROOT` counts as unset. An empty `--sdk-root=` fails with `sdk_root_value_invalid`.
- **Placement.** `execute` only. Put it before `<collection>:<schematic>`; after the positional it is rejected (`invalid_input`), never passed to the schematic. `new schematic` and `info` read neither the flag nor the variable.
- **With `--manifest`.** Both work together. An external manifest's own `sdk` block stays ignored — with `warn_manifest_sdk_root_ignored` when it declares `sdk.root` — whichever source supplies the SDK.
- **Announcement.** A root that came from `BUILDER_SDK_ROOT` prints `warn_sdk_root_ambient`, which names the variable but never the path; a root from `--sdk-root` is not announced. To see which SDK ran, check the variable or run `readlink node_modules/@pbuilder/sdk`.
- **Messages.** The `sdk_root_*` reasons of `sdk.root` apply unchanged, and their messages still say `sdk.root` when the value came from the flag or the variable.
- **Existing local installs.** A real `node_modules/@pbuilder/sdk` that differs from the named root fails with `execute_sdk_link_path_conflict`. Before setting `BUILDER_SDK_ROOT` for every checkout, remove the SDK installed in each of them.
- **Stopping.** Unsetting the variable, or dropping the flag, does not remove the link. The next run without an external root fails with `execute_manifest_path_escape`; delete the link as described in [Removing `sdk.root`](#external-sdk-root-sdkroot).

### Passing inputs to the schematic

Everything **after** the `<collection>:<schematic>` positional argument is treated as a raw schematic flag, not a CLI flag. Global flags such as `--output` and `--theme` must therefore be placed **before** the positional argument.

Schematic flag tokens follow these rules:

- `--name=value` — string input; the value is kept verbatim (an `=` inside the value is not re-split).
- `--name` — boolean input set to `true`.
- `--no-name` — boolean input set to `false`.
- Tokens that do not start with `--` (bare words, single-dash flags) are skipped with a warning.
- Duplicate flag names are preserved in order, with a warning.

### External manifest (`--manifest`)

`--manifest=<path>` reads `project-builder.json`, collections, factories, schemas and templates from another directory on this machine, while generated files are still written to the working directory. The `BUILDER_MANIFEST` environment variable does the same; the flag always wins over it. See [External collections](/guides/external-collections/) for the full workflow.

- **Value.** A directory or its `project-builder.json`, absolute or relative to the working directory, canonicalised once. Local paths only: URL schemes and drive letters are rejected. Naming the working directory is the same as omitting the flag.
- **Placement.** Put it before `<collection>:<schematic>`. After the positional it is rejected (`invalid_input`), never passed to the schematic.
- **Trust.** The root, and every directory above it, must not be writable by other users or by a group (a world-writable ancestor with the sticky bit is allowed), and must be owned by you or by root. The filesystem root and your home directory itself are refused.
- **Paths in the manifest** must be relative to the manifest root and stay inside it.
- **SDK.** The run uses the working directory's own `@pbuilder/sdk` (0.3.1 or later) — installed in a real `node_modules`, or named with [`--sdk-root` or `BUILDER_SDK_ROOT`](#--sdk-root-and-builder_sdk_root). The manifest root and its ancestors must not contain another `@pbuilder/sdk` copy, or the run fails with a split module graph. `sdk.root` and `sdk.version` in the external manifest are ignored.
- **Warnings.** A root that came from `BUILDER_MANIFEST` is announced with `warn_manifest_root_ambient`; an ignored external `sdk.root` with `warn_manifest_sdk_root_ignored`.

### Flags

| Flag | Effect |
|---|---|
| `--manifest=<path>` | Read the manifest, collections and schematics from this directory (or its `project-builder.json`) instead of the working directory. Must precede `<collection>:<schematic>`. See [External manifest](#external-manifest---manifest). |
| `--sdk-root=<dir>` | Run against the `@pbuilder/sdk` in this directory instead of the workspace's installed SDK or `sdk.root`. Also read from `BUILDER_SDK_ROOT`; the flag wins. Must precede `<collection>:<schematic>`. See [`--sdk-root` and `BUILDER_SDK_ROOT`](#--sdk-root-and-builder_sdk_root). |
| `--commit=<never\|always>` | Write mode. Default `always`. `ask` is accepted syntactically but rejected — reserved for a future release. |
| `--dry-run` | Alias for `--commit=never`. Setting `--dry-run` together with a disagreeing `--commit` value is an error. |
| `--non-interactive` | Reserved — not yet implemented; emits a warning if set. |
| `--strict` | Reserved — not yet implemented; emits a warning if set. |
| `--force` | Reserved — not yet implemented; emits a warning if set. |
| `--auto-install` | Reserved — not yet implemented; emits a warning if set. |

**Native engine limitation:** `--dry-run` / `--commit=never` is unsupported. The native adapter rejects any commit mode other than `always` before constructing or running the engine; it does not produce a preview. Place CLI flags **before** `<collection>:<schematic>`: after it, `--dry-run` is only a schematic input and does not select the CLI's no-write mode. Do not rely on that placement to prevent writes.

### Examples

```sh
# Run a schematic from the default collection with a string input
builder execute default:my-component --name=button

# Alias form, boolean and negated inputs
builder g default:my-component --standalone --no-tests

# Global flags go BEFORE the positional; schematic flags go after
builder --output=json execute default:my-component --name=button

# Unsupported for native schematics: rejected, not a preview
builder execute --dry-run default:my-component

# Run a schematic registered in another checkout; files land in the working directory
builder execute --manifest=../app-schematics default:my-component --name=button

# Same, against a globally installed SDK instead of one in node_modules
builder execute --manifest=../app-schematics --sdk-root=/Users/me/.bun/install/global/node_modules/@pbuilder/sdk default:my-component --name=button
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

Type generation is delegated to `pbuilder-codegen`, a binary shipped inside `@pbuilder/sdk`. When the SDK is not installed, the automatic codegen step skips with a warning rather than failing the scaffold (`schema.generated.ts` is left stale or absent). With [`sdk.root`](#external-sdk-root-sdkroot) configured, codegen runs from that root; a root that fails validation is treated as no usable SDK. To regenerate types later — for one schematic or every registered collection — see [Type generation](/guides/type-generation/).

### Flags

| Flag | Effect |
|---|---|
| `--force` | Overwrite an existing schematic of the same name. |
| `--dry-run` | Preview planned operations without writing any files. |
| `--inline` | Embed the schematic definition in `project-builder.json` instead of creating standalone files. |
| `--language=<ts\|js>` | Force TypeScript or JavaScript factory. Auto-detect default: TS if `devDependencies.typescript` or `tsconfig.json` exists; falls back to TS with a warning otherwise. |
| `--extends=<@scope/pkg:base>` | Declare a base schematic this one extends. Grammar enforced (`@scope/pkg:collection`); path traversal rejected. |
| `--manifest=<path>` | Accepted only when it names the working directory itself. `new schematic` always writes to the working directory: if `--manifest` or `BUILDER_MANIFEST` names another directory, it refuses with `manifest_scoped_authoring_refused` before writing — `cd` into that directory instead. |

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
builder info [<collection>[:<schematic>]] [--manifest=<path>]
```

### What it does

The single optional argument selects one of three forms:

| Form | Result |
|---|---|
| `builder info` | List registered collections |
| `builder info <collection>` | List a collection's schematics |
| `builder info <collection>:<schematic>` | Show a schematic's full input detail |

### Flags

| Flag | Effect |
|---|---|
| `--manifest=<path>` | Inspect the manifest in this directory (or this `project-builder.json`) instead of the working directory. Also read from `BUILDER_MANIFEST`; the flag wins. Unlike `execute`, it may come before or after the argument. See [External manifest](#external-manifest---manifest). |

Pass the global `--output=json` for machine-readable output.

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

# Inspect collections registered in another directory
builder info --manifest=../app-schematics default
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
