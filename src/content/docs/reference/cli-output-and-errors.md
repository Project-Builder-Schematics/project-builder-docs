---
title: CLI Output & Errors
description: How the builder CLI formats its output, which environment variables and flags control it, and the complete error-code and exit-code contract.
sidebar:
  order: 2
---

The `builder` CLI is AI-first by design: every command has a machine-readable JSON mode, and every error carries a structured code with actionable suggestions. This page documents the user-facing output contract — formats, theming, verbosity — and the full error and exit-code reference.

## Output formats

The CLI has two output formats, selected by the global `--output` flag:

| Format | Selected by | Behaviour |
|---|---|---|
| `pretty` | `--output=pretty`, or default when stdout is a terminal | Human-readable, themed output: headings, paths, success/warning/error lines rendered with the active color theme. |
| `json` | `--output=json`, or default when stdout is **not** a terminal (pipes, CI) | NDJSON for CI/pipes and AI consumption. Machine-readable envelopes are written to stdout; human "chrome" (warnings, engine event rendering) is routed to stderr so stdout carries only the envelope. |

When `--output` is unset, the format is auto-detected from the terminal: an interactive TTY gets `pretty`, a piped or redirected stdout gets `json`. This makes `builder ... | jq` and CI invocations machine-readable without any extra flags.

`builder init` additionally accepts a local `--json` boolean flag selecting the same NDJSON output, and combines with `--dry-run` for a full structured plan of every operation without writing anything (see the [dry-run guide](/guides/dry-run/)).

### Flag placement with `builder execute`

`builder execute` treats every token after the `<collection>:<schematic>` positional argument as a raw schematic flag. Place `--output`, `--theme`, and `--verbose` **before** the positional:

```sh
# Correct — --output is a CLI flag
builder --output=json execute default:my-component --name=button

# Here --output=./dist is passed through to the schematic, NOT to the CLI
builder execute default:my-component --output=./dist
```

## Verbosity

`--verbose` (global, text mode only) prints full diagnostic output — sanitised — for subprocess and engine failures, and enables debug-level log lines. Several error remedies suggest re-running with `--verbose` to see the full subprocess output (for example after a package-manager install failure or a codegen failure). JSON output is unaffected by `--verbose`.

## Theming

Pretty output is rendered through an 8-token semantic color palette with light and dark variants. Appearance resolves via a three-level precedence chain:

```
--theme flag  >  BUILDER_THEME env  >  auto-detect
```

| Precedence | Source | Values |
|---|---|---|
| Highest | `--theme` flag | `light`, `dark`, `auto` (default) |
| Middle | `BUILDER_THEME` environment variable | `light`, `dark` |
| Lowest | Auto-detection | Queries the terminal's background color |

```sh
# Force light via environment variable
BUILDER_THEME=light builder info

# Flag wins over env (appearance = light)
BUILDER_THEME=dark builder --theme=light info
```

Auto-detection is lazy: an explicit `--theme` or `BUILDER_THEME` skips it entirely. In unusual PTY automation setups the background-color query can stall startup for up to 5 seconds before falling back — set `BUILDER_THEME` to bypass detection. When stdout is piped or the terminal reports no color support, output degrades gracefully to plain text.

## Error contract

Every error the CLI emits includes:

- a stable, machine-readable **`code`** (e.g. `init_config_exists`),
- a human-readable **message**, and
- a non-empty **suggestions** list — `Fix:` entries are direct remedies, `Note:` entries are context.

Some codes also carry a **`reason`** that distinguishes variants of the same code, and a short, path-free **`detail`** (for example which field failed). Both appear in JSON output; the tables below list the reason where it changes the remedy.

In text mode, errors render as a fixed block on **stderr**, independent of where stdout is redirected. In JSON mode, `builder execute` writes a structured JSON error envelope to stdout instead (and the text block is suppressed), so machine consumers always find the error in the stream they are parsing.

Interactive prompts for **sensitive** schematic inputs are refused outside a TTY (`engine_non_tty_ask_unavailable`) — in scripts and CI, pass the value explicitly with `builder execute <collection>:<schematic> --<name>=<value>`.

## Exit codes

Every terminating error resolves to exactly one exit family:

| Code | Family | Meaning |
|---|---|---|
| 0 | success | No error. |
| 1 | internal | Fail-closed — unclassifiable cause, `*_not_implemented` codes, and every code not otherwise assigned. |
| 2 | usage | CLI input/flag/argument/workspace-state validation. |
| 3 | config | The project's own declared configuration is missing, corrupt, or escaping the workspace. |
| 4 | sdk | SDK layer failure (`@pbuilder/sdk` missing or version mismatch). |
| 5 | engine | Engine layer failure. |
| 130 | cancelled | SIGINT (Ctrl-C), following the shell convention 128+2. |

The family is derived from the outermost CLI error in the chain — never from a wrapped subprocess's own exit code.

## Error code reference

Complete registry of error codes, grouped by area. Where one code covers several distinct situations, each variant message gets its own row.

### General

| Code | Exit | Message | Remedy |
|---|---|---|---|
| `cancelled` | 130 | run cancelled | Note: re-run the command to try again |
| `cli_prompt_failed` | 1 | could not read your answer from the terminal | Fix: re-run in an interactive terminal, or pass the value with `--<name>=<value>` |
| `cli_unknown_flag` | 2 | unrecognised command-line flag | Fix: run `--help` to see the accepted flags |
| `invalid_input` | 2 | input value invalid | Note: check the input value against its expected format |
| `not_implemented` | 1 | command not yet implemented | Note: this command is not implemented yet |
| `collection_manifest_invalid` | 3 | collection manifest not found | Fix: check that `collection.json` exists at the registered path |
| `collection_manifest_invalid` | 3 | collection manifest unparseable | Note: edit `collection.json` to fix the JSON syntax error |

### `builder init`

| Code | Exit | Message | Remedy |
|---|---|---|---|
| `init_agent_file_ambiguous` | 2 | both AGENTS.md and CLAUDE.md already contain the pbuilder skill marker — ambiguous which file to update | Fix: run with `--force` to refresh the marker block in both files; or remove the marker from one file manually and re-run |
| `init_config_exists` | 2 | project-builder.json already exists | Fix: run with `--force` to safely upgrade — existing collections, dependencies, and settings are preserved; or remove `project-builder.json` manually and re-run |
| `init_dir_not_empty` | 2 | target directory is not empty | Fix: run with `--force` to initialise anyway |
| `init_install_failed` | 3 | package manager install failed | Fix: use `--no-install` to skip the install step and run it manually later; or re-run with `--verbose` to see the full subprocess output |
| `init_marker_corrupt` | 3 | the pbuilder skill marker block in the agent file is malformed | Fix: close the block with `<!-- pbuilder:skill:end -->`, remove duplicate or orphaned marker lines, then re-run |
| `init_not_implemented` | 1 | init mode not yet implemented | Note: this init mode is not implemented yet |
| `init_package_manager_not_found` | 3 | package manager not found | Fix: run with `--package-manager` to select one explicitly |
| `init_skill_exists` | 2 | skill artefact set already exists (`.claude/skills/pbuilder/`) | Fix: run with `--force` to overwrite the full skill artefact set |
| `invalid_input` | 2 | package.json is not valid JSON | Fix: fix the syntax errors in `package.json` and re-run |
| `invalid_input` | 2 | package.json `<field>` field is not a valid string map | Note: fix the `devDependencies` or `scripts` field (for example a `null` value) and re-run. See [`package.json` edits](/reference/cli-commands/#packagejson-edits) |

A failed `init` leaves the outputs written before the failure on disk. Once fixed, re-run with `--force`.

### `builder new`

| Code | Exit | Message | Remedy |
|---|---|---|---|
| `new_codegen_failed` | 4 | @pbuilder/sdk installation could not be resolved for code generation | Fix: reinstall the SDK: `bun add -d @pbuilder/sdk`; or re-run with `--verbose` to see the full subprocess output |
| `new_codegen_failed` | 4 | pbuilder-codegen failed | Fix: re-run with `--verbose` to see the codegen output. If it reports `refusing symbolic-link output`, reinstalling does not help — see [Symbolic-link outputs](/guides/type-generation/#symbolic-link-outputs) |
| `new_collection_exists` | 2 | collection already exists | Fix: run with `--force` to overwrite |
| `new_invalid_extends` | 2 | `--extends` value does not match the required grammar | Note: `--extends` must be in the form `@scope/pkg:collection` |
| `new_invalid_language` | 2 | `--language` value is not supported | Note: `--language` accepts `ts` or `js` |
| `new_invalid_name` | 2 | schematic name is invalid | Note: names may not contain path separators, shell metacharacters, or null bytes |
| `new_mode_conflict` | 2 | incompatible flags combined | Note: `--inline`, `--force`, and `--publishable` cannot be combined in this way |
| `new_node_not_found` | 3 | no Node.js binary found | Fix: install Node.js >= 18 and ensure it is on PATH, or set `NODE_BINARY` |
| `new_not_implemented` | 1 | new mode not yet implemented | Note: this new mode is not implemented yet |
| `new_schematic_exists` | 2 | schematic already exists | Fix: run with `--force` to overwrite |

### `builder execute`

| Code | Exit | Message | Remedy |
|---|---|---|---|
| `execute_ambiguous_registration` | 2 | registration is ambiguous | Note: resolve the collection or schematic to a single registration mode |
| `execute_collection_not_found` | 2 | collection not found in project-builder.json | Note: check `project-builder.json` for the registered collection name |
| `execute_commit_mode_unsupported` | 2 | commit mode is not supported | Fix: use `--commit=never` or `--commit=always` (or `--dry-run` for `never`) |
| `execute_invalid_factory_pointer` | 2 | schematic's factory pointer does not parse | Note: edit `collection.json`'s factory to `<module>#<export>` |
| `execute_invalid_factory_pointer` | 2 | schematic has both factory.ts and factory.js — ambiguous | Note: remove `factory.ts` or `factory.js` so only one remains |
| `execute_invalid_factory_pointer` | 2 | schematic is missing a factory.ts or factory.js file | Note: create `factory.ts` or `factory.js` in the schematic root |
| `execute_invalid_factory_pointer` | 2 | schematic's factory pointer is empty or missing in collection.json | Note: set `collection.json`'s factory to `<module>#<export>` |
| `execute_invalid_input_value` | 2 | input value is invalid | Note: check the input's type, enum values, and whether it is scalar-typed |
| `execute_manifest_path_escape` | 3 | manifest-derived path resolves outside the workspace root | Note: check the manifest for a path that escapes the project workspace |
| `execute_missing_required_inputs` | 2 | missing required input(s) | Fix: `builder execute <collection>:<schematic> --<name>=<value>` |
| `execute_project_not_initialized` | 3 | project-builder.json not found | Fix: run `builder init` to create `project-builder.json` |
| `execute_project_not_initialized` | 3 | project-builder.json exists but could not be parsed | Note: edit `project-builder.json` to fix the JSON syntax error |
| `execute_schema_invalid` | 3 | schema.json is present but could not be parsed | Note: edit `schema.json` to fix the JSON syntax error |
| `execute_schematic_not_found` | 2 | schematic not found in collection | Note: check the collection's manifest for the registered schematic name |
| `execute_sdk_not_installed` | 4 | varies by reason | See [SDK diagnostics](#sdk-diagnostics) |
| `execute_sdk_version_mismatch` | 4 | varies by reason | See [SDK diagnostics](#sdk-diagnostics) |
| `execute_unsupported_registration` | 2 | schematic is registered in a mode execute does not support | Note: register the schematic as path-mode or collection-mode |
| `execution_failed` | 5 | schematic execution failed | Note: check the schematic's own output above for the underlying cause |

### SDK diagnostics

`builder execute` checks the workspace's SDK before running anything (see [SDK requirement](/reference/cli-commands/#sdk-requirement)). Each reason calls for a different repair — only `sdk_absent` means the SDK is actually missing.

| Code | Reason | Exit | Message | Repair |
|---|---|---|---|---|
| `execute_sdk_not_installed` | `sdk_absent` | 4 | @pbuilder/sdk is not installed in this workspace | Provide a compatible SDK at `node_modules/@pbuilder/sdk` (see below) |
| `execute_sdk_not_installed` | `sdk_dist_incomplete` | 4 | local @pbuilder/sdk distribution is incomplete | The package is there but required distribution files are missing — reinstall it |
| `execute_sdk_not_installed` | `sdk_installation_unreadable` | 4 | local @pbuilder/sdk installation could not be read; check permissions and broken links | Check permissions and dangling symlinks on `node_modules/@pbuilder/sdk` |
| `execute_sdk_version_mismatch` | `sdk_requirement_invalid` | 4 | @pbuilder/sdk requirement is invalid; correct the selected declaration or configuration | Fix the value named in `detail`, for example `project-builder.json.sdk.version: expected a numeric version floor` |
| `execute_sdk_version_mismatch` | `sdk_requirement_unreadable` | 4 | @pbuilder/sdk requirement could not be read; check package.json permissions and size | Check that the workspace `package.json` is readable and not oversized |
| `execute_sdk_version_mismatch` | `sdk_version_unparseable` | 4 | installed @pbuilder/sdk version is invalid; check the local package.json | Inspect the `version` in `node_modules/@pbuilder/sdk/package.json` |
| `execute_sdk_version_mismatch` | `sdk_version_below_floor` | 4 | installed @pbuilder/sdk version is below the selected requirement; choose a compatible version | Install a version that meets the selected requirement, or correct the requirement |

The CLI does not detect your package manager for these errors: its suggestions list one local installation command per manager, and you choose one. They change `package.json` and may change the lockfile:

| Package manager | Command |
|---|---|
| npm | `npm install --save-dev @pbuilder/sdk` |
| pnpm | `pnpm add -D @pbuilder/sdk` |
| Yarn | `yarn add --dev @pbuilder/sdk` |
| Bun | `bun add -D @pbuilder/sdk` |

Pin a version when you need reproducible installs. To provide an SDK without declaring it, see [Evaluate without adopting the SDK](/guides/evaluate-without-sdk/).

### `builder info`

| Code | Exit | Message | Remedy |
|---|---|---|---|
| `info_ambiguous_registration` | 2 | registration is ambiguous | Note: resolve the collection to a single registration mode |
| `info_collection_not_found` | 2 | collection not found in project-builder.json | Note: check `project-builder.json` for the registered collection name |
| `info_invalid_factory_pointer` | 3 | schematic's factory pointer is empty or missing | Note: edit `collection.json`'s factory to `<module>#<export>` |
| `info_manifest_invalid` | 3 | collection manifest not found | Fix: check that `collection.json` exists at the registered path |
| `info_manifest_invalid` | 3 | collection manifest could not be parsed | Note: edit `collection.json` to fix the JSON syntax error |
| `info_project_not_initialized` | 3 | project-builder.json not found | Fix: run `builder init` to create `project-builder.json` |
| `info_project_not_initialized` | 3 | project-builder.json exists but could not be parsed | Note: edit `project-builder.json` to fix the JSON syntax error |
| `info_schema_invalid` | 3 | schema.json is missing or could not be parsed | Note: ensure `schema.json` exists at the schematic root and is valid JSON |
| `info_schematic_not_found` | 2 | schematic not found in collection | Note: check the collection's manifest for the registered schematic name |

### Engine

| Code | Exit | Message | Remedy |
|---|---|---|---|
| `engine_non_tty_ask_unavailable` | 2 | sensitive input requires an interactive session | Fix: run in an interactive terminal, or provide it via `builder execute <collection>:<schematic> --<name>=<value>` |
| `engine_not_found` | 5 | schematics engine binary not found | Fix: install the Angular Schematics CLI: `npm install -g @angular-devkit/schematics-cli` |
| `engine_version_mismatch` | 5 | schematics engine version below the required floor | Fix: upgrade `@angular-devkit/schematics-cli` to the required version |
| `engine_native_commit_mode_unsupported` | 5 | the native engine adapter does not support dry-run yet | Note: only `CommitMode: always` is supported today |
| `engine_native_developer_fault` | 5 | native engine execution failed due to a developer-facing fault in the schematic or its inputs | Note: check the schematic's file writes and inputs for the underlying cause |
| `engine_native_invalid_factory_url` | 5 | factory URL is empty or malformed | Note: this indicates an internal wiring defect in factory-pointer resolution |
| `engine_native_invalid_plan` | 5 | execute request has no pre-flight plan | Note: this indicates an internal wiring defect — pre-flight must run before the native engine adapter |
| `engine_native_invalid_sdk_anchor` | 5 | execute plan has no resolved SDK location | Note: this indicates an internal wiring defect — pre-flight must run before the native engine adapter |
| `engine_native_provisioning_failed` | 5 | the native engine's runtime could not be provisioned | Note: check network access, disk space, and binary verification for the native engine's runtime |
| `engine_native_system_fault` | 5 | native engine system fault | Note: this indicates an engine-side system failure — re-run and report if it persists |
| `engine_native_workspace_inconsistent` | 5 | the workspace may be partially written and is in an inconsistent state | Note: inspect the workspace manually before re-running this operation |
| `engine_spurious_cancellation` | 5 | engine reported a cancellation with no genuine signal behind it | Note: this indicates an engine-side defect — re-run and report if it persists |
| `engine_stream_ended_without_terminal` | 5 | engine event stream ended without a terminal event | Note: this indicates an engine-side defect — re-run and report if it persists |
