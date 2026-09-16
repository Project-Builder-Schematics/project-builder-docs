---
title: Librerías AST
description: Qué librería AST respalda a cada dialecto, la versión que declara el SDK, dónde está su documentación y cómo acceder a ella desde una factory.
sidebar:
  order: 3
---

Cada [dialecto](/es/guides/modify/) parsea su tipo de archivo con una librería AST elegida por él. Esta página es el inventario: úsala para saber qué documentación de librería aplica al AST que recibes en `.modify()`, y cómo importar los helpers y tipos de esa librería. Para ejemplos completos, ver [Ediciones personalizadas con `.modify()`](/es/guides/modify/#ediciones-personalizadas-con-modify).

## Dialectos actuales

| Dialecto | Ruta de importación | Librería | Versión declarada | Documentación | Acceso desde una factory |
|---|---|---|---|---|---|
| TypeScript | `@pbuilder/sdk/typescript` | ts-morph | `28.0.0` — versión exacta en las `dependencies` del SDK | [ts-morph.com](https://ts-morph.com/) | `.modify()` recibe un `SourceFile` de ts-morph; la librería completa se exporta como `astLibrary` |
| React / TSX | `@pbuilder/sdk/react` | ts-morph | `28.0.0` — versión exacta en las `dependencies` del SDK | [ts-morph.com](https://ts-morph.com/) | `.modify()` recibe un `SourceFile` de ts-morph; la librería completa se exporta como `astLibrary` |

La columna de versión es la dependencia que declara el `package.json` del SDK, no una comprobación en tiempo de ejecución de lo que instaló tu gestor de paquetes. Tampoco tiene relación con el compilador de TypeScript que usa el SDK para su propio desarrollo.

Todavía no existen otros dialectos. Hay dialectos de HTML, CSS y frameworks planificados; hasta que existan, edita esos archivos con [`find` de `@pbuilder/sdk/commons`](/es/guides/modify/#archivos-sin-dialecto).

## `astLibrary`

Cada dialecto exporta su librería **completa** como un namespace llamado `astLibrary`, desde el mismo punto de entrada que su `find`:

```ts
import { find, astLibrary } from "@pbuilder/sdk/typescript";

astLibrary.SyntaxKind.JsxElement;           // runtime constants
astLibrary.Node.isStringLiteral(node);       // runtime classes and helpers
type Decl = astLibrary.VariableDeclaration;  // types
```

- Es la librería entera, reexportada de forma nativa — no un subconjunto seleccionado.
- El callback de `.modify()` sigue recibiendo solo el AST. `astLibrary` se importa; nunca se pasa como argumento.
- No necesitas una dependencia directa de ts-morph para trabajar con el AST de un dialecto.

## Pertenencia y compatibilidad

- **Cada dialecto es dueño de su librería**, de su versión y de dónde se carga. Los dos dialectos actuales declaran la misma librería en la misma versión, pero eso no es una regla para dialectos futuros.
- **Usa el `astLibrary` del dialecto con el que estás editando.** Que coincidan el nombre de la librería o la versión no hace intercambiables los objetos de instalaciones distintas — ni de dialectos distintos.
- **Un ts-morph que instales tú es una copia separada.** Los nodos creados con él no deben mezclarse con el AST del callback.

## Mantener esta página al día

Este inventario refleja el SDK. Actualiza ambos idiomas en el mismo cambio cada vez que se agregue o elimine un dialecto, cambie su librería o su versión declarada, la declaración deje de ser una versión exacta, o cambie la superficie de `astLibrary`. Revisa tres lugares del SDK: el mapa `exports` y las `dependencies` de `package.json`, y en cada dialecto su punto de entrada (`src/dialects/<name>/index.ts`) y su adaptador de AST (`src/dialects/<name>/ast.ts`). Si en el futuro la declaración es un rango de versiones, documenta el rango en lugar de una versión única.

Para contribuidores que construyen un dialecto: la [guía de autoría de dialectos](https://github.com/Project-Builder-Schematics/project-builder-sdk/blob/main/docs/authoring-a-dialect.md#mandatory-module-export-and-fixture-migration) del SDK cubre el export obligatorio de `astLibrary` y el fixture de conformance.
