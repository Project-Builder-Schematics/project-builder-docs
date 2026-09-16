---
title: AST Libraries
description: Which AST library backs each dialect, the version the SDK declares, where its documentation lives, and how to reach it from a factory.
sidebar:
  order: 3
---

Each [dialect](/guides/modify/) parses its file type with an AST library of its own choosing. This page is the inventory: use it to know which library's documentation applies to the AST you receive in `.modify()`, and how to import that library's helpers and types. For worked examples, see [Custom edits with `.modify()`](/guides/modify/#custom-edits-with-modify).

## Current dialects

| Dialect | Import path | Backing library | Declared version | Upstream documentation | Access from a factory |
|---|---|---|---|---|---|
| TypeScript | `@pbuilder/sdk/typescript` | ts-morph | `28.0.0` — exact pin in the SDK's `dependencies` | [ts-morph.com](https://ts-morph.com/) | `.modify()` receives a ts-morph `SourceFile`; the full library is exported as `astLibrary` |
| React / TSX | `@pbuilder/sdk/react` | ts-morph | `28.0.0` — exact pin in the SDK's `dependencies` | [ts-morph.com](https://ts-morph.com/) | `.modify()` receives a ts-morph `SourceFile`; the full library is exported as `astLibrary` |

The version column is the dependency the SDK's `package.json` declares, not a runtime check of what your package manager installed. It is also unrelated to the TypeScript compiler the SDK uses for its own development.

No other dialects exist yet. HTML, CSS and framework-specific dialects are planned; until they ship, edit those files with [`find` from `@pbuilder/sdk/commons`](/guides/modify/#files-without-a-dialect).

## `astLibrary`

Every dialect exports its **complete** backing library as a namespace named `astLibrary`, from the same entry point as its `find`:

```ts
import { find, astLibrary } from "@pbuilder/sdk/typescript";

astLibrary.SyntaxKind.JsxElement;           // runtime constants
astLibrary.Node.isStringLiteral(node);       // runtime classes and helpers
type Decl = astLibrary.VariableDeclaration;  // types
```

- It is the whole library, forwarded natively — not a curated subset.
- The `.modify()` callback still receives only the AST. `astLibrary` is imported, never passed in.
- You do not need a direct ts-morph dependency to work with a dialect's AST.

## Ownership and compatibility

- **Each dialect owns its library**, its version and where it is loaded from. The two current dialects happen to declare the same library at the same version; that is not a rule for future dialects.
- **Use the `astLibrary` of the dialect you are editing with.** Matching library names or version strings do not make objects from different installations — or from different dialects — interchangeable.
- **A ts-morph you install yourself is a separate copy.** Nodes created from it must not be mixed with the callback's AST.

## Keeping this page accurate

This inventory mirrors the SDK. Update both locales in the same change whenever a dialect is added or removed, its backing library or declared version changes, the declaration stops being an exact pin, or the `astLibrary` surface changes. Check three places in the SDK: the `exports` map and `dependencies` in `package.json`, and each dialect's entry point (`src/dialects/<name>/index.ts`) and AST adapter (`src/dialects/<name>/ast.ts`). If a future declaration is a version range, document the range instead of a single version.

Contributors building a dialect: the SDK's [dialect authoring guide](https://github.com/Project-Builder-Schematics/project-builder-sdk/blob/main/docs/authoring-a-dialect.md#mandatory-module-export-and-fixture-migration) covers the mandatory `astLibrary` export and the conformance fixture.
