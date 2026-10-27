---
title: project-builder.json
description: Cada clave del archivo de configuración del workspace que escribe builder init, lo que la CLI lee de él, y el JSON schema que usan los editores para validarlo.
sidebar:
  order: 4
---

`project-builder.json` vive en la raíz del proyecto y ancla el workspace. `builder init` lo escribe; `builder execute` y `builder new schematic` lo leen.

## Validación en el editor

`builder init` escribe un puntero `$schema` al schema que distribuye `@pbuilder/sdk`:

```json
{
  "$schema": "./node_modules/@pbuilder/sdk/schemas/project-builder.schema.json"
}
```

Una vez instalado `@pbuilder/sdk`, los editores con soporte de JSON schema (VS Code, los IDE de JetBrains y cualquier editor con un language server de JSON) validan el archivo y autocompletan sus claves. El schema se distribuye con `@pbuilder/sdk` `0.5.0` y posteriores. Con una [raíz externa del SDK](/es/reference/cli-commands/#sdk-externo-sdkroot), `node_modules/@pbuilder/sdk` es un enlace a esa raíz, así que la misma ruta sigue resolviendo.

## Ejemplo

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

## Claves de nivel superior

| Clave | Tipo | Lo que escribe `init` | Propósito |
|---|---|---|---|
| `$schema` | string | la ruta de arriba | Indica a los editores dónde está el schema. La CLI no lo lee. |
| `version` | string | `"1"` | Versión del formato de configuración. |
| `collections` | object | `{}` | Colecciones por nombre. Ver [`collections`](#collections). |
| `dependencies` | object | `{}` | Nombres de paquete asociados a rangos semver. La CLI no lo lee: la selección del SDK usa `package.json` y [`sdk.version`](#sdk). |
| `settings` | object | los valores por defecto de abajo | Ver [`settings`](#settings). |
| `skill` | object | `{ "enabled": true, "path": ".claude/skills/pbuilder/SKILL.md" }` | El skill de agente que instala `init`. `enabled` es `false` tras `init --no-skill`. |
| `sdk` | object | no se escribe | Ver [`sdk`](#sdk). |

Las claves que la CLI no conoce se conservan tal cual, también con `init --force`, así que puedes guardar tus propios datos en el nivel superior.

## `collections`

Cada entrada de `collections` adopta una de dos formas.

En modo colección, la entrada apunta a un `collection.json`:

```json
{
  "collections": {
    "widgets": { "path": "./libs/widgets/collection.json" }
  }
}
```

Una entrada con un string `path` siempre se lee como modo colección.

Un contenedor de schematics asocia nombres de schematic a sus directorios. `builder new schematic` escribe esta forma en `default`:

```json
{
  "collections": {
    "default": {
      "api-endpoint": { "path": "./schematics/api-endpoint" }
    }
  }
}
```

Dentro de un contenedor de schematics, la clave `schematics` está reservada para registros inline (`{ "schematics": { "<name>": { "factory": "<module>#<export>" } } }`). `builder execute` rechaza un schematic registrado solo inline con `execute_unsupported_registration`, y un nombre registrado de ambas formas con `execute_ambiguous_registration`. Ver [Salida y errores de la CLI](/es/reference/cli-output-and-errors/).

Todas las rutas son relativas al workspace y deben quedar dentro de él.

## `settings`

| Clave | Tipo | Por defecto | Valores |
|---|---|---|---|
| `autoInstall` | boolean | `true` | |
| `conflictPolicy` | string | `"child-wins"` | `child-wins`, `strict` |
| `depValidation` | string | `"dev"` | `dev`, `strict` |
| `schematicCollections` | string[] | `["default"]` | Nombres de colección, en orden |

`schematicCollections` es la lista ordenada de colecciones donde se busca un schematic indicado sin colección, y su primera entrada es la colección en la que escribe `builder new schematic`. Una lista ausente o vacía equivale a `["default"]`.

La CLI todavía no actúa sobre `autoInstall`, `conflictPolicy` ni `depValidation`, y no valida sus valores. El schema lista los valores documentados para que los editores marquen un error de tipeo.

Un `settings` ausente o `null` equivale a todos los valores por defecto. Las claves desconocidas dentro de `settings` se pierden cuando `init --force` reescribe el archivo.

## `sdk`

| Clave | Tipo | Propósito |
|---|---|---|
| `version` | string | Versión mínima de `@pbuilder/sdk`, usada cuando `package.json` no declara ninguna. Ver [Requisito del SDK](/es/reference/cli-commands/#requisito-del-sdk). |
| `root` | string | Ruta absoluta, o relativa a la configuración, a un directorio externo del paquete `@pbuilder/sdk`. Ver [Raíz externa del SDK](/es/reference/cli-commands/#sdk-externo-sdkroot). |

Ambas claves son opcionales e independientes. `init` nunca escribe `sdk`.

## `init --force`

Volver a ejecutar `builder init --force` sobre un workspace existente reescribe el archivo:

- `$schema`, `version` y `skill` vuelven a los valores que escribe `init`.
- `collections`, `dependencies` y `settings` conservan tus valores.
- `sdk` y toda clave desconocida de nivel superior se conservan tal cual.
- Las claves desconocidas dentro de `settings` se pierden.
