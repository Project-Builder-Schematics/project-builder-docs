---
title: Comandos de la CLI
description: El catálogo completo de comandos de la CLI builder, sus argumentos, flags y ejemplos de uso.
sidebar:
  order: 1
---

El binario `builder` es el punto de entrada de cara al usuario de Project Builder: parsea comandos, valida la entrada y orquesta los motores de schematics. Esta página cataloga cada comando registrado. Si todavía no has instalado la CLI, comienza por la [guía de instalación](/es/getting-started/installation/).

Ejecuta `builder --help` para ver el listado de nivel superior, o `builder <command> --help` para el uso específico de cada comando. `builder --version` imprime la versión del binario.

## Resumen de comandos

| Comando | Alias | Estado | Propósito |
|---|---|---|---|
| [`builder init`](#builder-init) | — | Disponible | Inicializar un workspace de Project Builder en el repositorio actual |
| [`builder execute`](#builder-execute) | `e`, `g`, `generate` | Disponible | Ejecutar un schematic contra un workspace de proyecto existente |
| [`builder new schematic`](#builder-new-schematic) | `s` | Disponible | Crear un nuevo schematic en el workspace |
| [`builder new collection`](#builder-new-collection) | `c` | Disponible | Crear una nueva colección en el workspace |
| [`builder info`](#builder-info) | — | Disponible | Inspeccionar las colecciones y schematics registrados del proyecto |
| [`builder add`](#comandos-aún-no-implementados) | — | No implementado | Agregar un nuevo artefacto a un workspace de proyecto existente |
| [`builder remove`](#comandos-aún-no-implementados) | — | No implementado | Eliminar un artefacto generado del workspace del proyecto |
| [`builder sync`](#comandos-aún-no-implementados) | — | No implementado | Reconciliar un workspace de proyecto con su colección de schematics |
| [`builder validate`](#comandos-aún-no-implementados) | — | No implementado | Validar el workspace del proyecto contra las restricciones de sus schematics |
| [`builder skill update`](#comandos-aún-no-implementados) | — | No implementado | Actualizar las skills y extensiones registradas a sus últimas versiones |

## Flags globales

Estos flags persistentes son aceptados por todos los comandos:

| Flag | Valores | Efecto |
|---|---|---|
| `--output` | `pretty`, `json` | Formato de salida: `pretty` (legible para humanos) o `json` (NDJSON para CI/pipes). Por defecto: autodetección según la terminal. |
| `--theme` | `light`, `dark`, `auto` | Esquema de color de la terminal. Por defecto `auto` — se resuelve desde la variable de entorno `BUILDER_THEME` o por detección de la terminal. |
| `--verbose` | booleano | Imprime la salida de diagnóstico completa (sanitizada) para fallas de subprocesos/motores y habilita líneas de log de nivel debug — solo en modo texto. |
| `--help` | booleano | Muestra la ayuda del comando. |
| `--version` | booleano | Imprime la versión de la CLI (solo en el comando raíz). |

Convenciones de flags booleanos: `--flag` significa `true`, `--no-flag` significa `false`, y `--flag=value` establece el valor explícito.

Consulta [Salida y errores de la CLI](/es/reference/cli-output-and-errors/) para ver cómo `--output`, `--theme` y `--verbose` determinan lo que imprime la CLI, y para el contrato de códigos de salida.

---

## `builder init`

Inicializa un workspace de Project Builder en un repositorio existente. Solo CLI — no invoca ningún motor de schematics.

### Sinopsis

```sh
builder init [directory] [flags]
```

`directory` es opcional. Cuando se omite, `init` opera sobre el directorio de trabajo actual. El directorio elegido se toma de forma literal — `init` **no** sube por el sistema de archivos buscando `.git` o `package.json`.

### Qué hace

Un `init` exitoso produce:

1. **`project-builder.json`** en la raíz del proyecto — el archivo ancla del workspace (schema v1, con `$schema` apuntando al paquete del SDK instalado localmente).
2. **`schematics/.gitkeep`** — carpeta esqueleto para la autoría de schematics locales (que luego completa `builder new schematic`).
3. **`.claude/skills/pbuilder/`** — el conjunto de artefactos de skill de IA incluido: `SKILL.md` (router) más `use.md`, `choose.md`, `create.md`.
4. **Un bloque de referencia delimitado en `AGENTS.md`** (preferido) o `CLAUDE.md` — idempotente y exacto línea a línea.
5. **`@pbuilder/sdk` agregado a `devDependencies`** en `package.json` — merge aditivo; las dependencias existentes se preservan.

Después de las escrituras, `init` opcionalmente invoca el gestor de paquetes detectado para instalar el SDK (con un timeout de 120 segundos). Luego, en una terminal interactiva, pregunta por la configuración del servidor MCP; una respuesta afirmativa imprime las instrucciones de configuración.

### Flags

| Flag | Efecto |
|---|---|
| `--force` | Re-ejecutar sobre un proyecto existente: `project-builder.json` se lee y fusiona (`collections`, `dependencies`, `settings` y las claves desconocidas se preservan), mientras que el conjunto de artefactos de skill y el bloque marcador se regeneran. |
| `--dry-run` | Previsualizar cada operación planificada sin escribir ningún archivo. Ver la [guía de dry-run](/es/guides/dry-run/). |
| `--json` | Emitir salida JSON legible por máquinas (NDJSON). Se combina con `--dry-run` para obtener un plan estructurado completo. |
| `--non-interactive` | Deshabilitar todos los prompts (apto para CI y agentes de IA). Con `--mcp` sin establecer, el valor por defecto es `--mcp=no`. |
| `--package-manager=<npm\|pnpm\|yarn\|bun>` | Sobrescribir la detección del gestor de paquetes. Por defecto: detección por lockfile (pnpm > yarn > bun > npm) con `npm` como fallback. |
| `--no-install` | Omitir el paso de instalación del gestor de paquetes. El SDK igual queda declarado en `package.json` — ejecuta la instalación manualmente más tarde. |
| `--no-skill` | Omitir atómicamente el conjunto de artefactos de skill, el bloque de referencia en AGENTS/CLAUDE y la dev-dependency del SDK. Úsalo cuando solo quieres `project-builder.json` + `schematics/`. |
| `--mcp=<yes\|no\|prompt>` | Controlar el prompt de configuración de MCP. Por defecto: `prompt` en una TTY, `no` bajo `--non-interactive`. `--mcp=prompt` es incompatible con `--non-interactive`. |
| `--publishable` | Reservado — actualmente devuelve el error `init_not_implemented`. |

### Ejemplos

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

Ejecuta un schematic con nombre contra un workspace de proyecto. Alias: `e`, `g`, `generate`.

### Sinopsis

```sh
builder execute <collection>:<schematic> [schematic flags]
```

Indica el schematic como `<collection>:<schematic>` (por ejemplo `@schematics/angular:component`). La colección debe estar registrada en `project-builder.json` (creado por `builder init`).

### Qué hace

`execute` valida el workspace (`project-builder.json` debe existir), resuelve la colección y el schematic a través de todas las formas de registro, valida tus entradas contra el `schema.json` del schematic, y luego ejecuta el schematic a través del motor, transmitiendo sus eventos a la terminal.

### Pasar entradas al schematic

Todo lo que aparece **después** del argumento posicional `<collection>:<schematic>` se trata como un flag crudo del schematic, no como un flag de la CLI. Los flags globales como `--output` y `--theme` deben por lo tanto ubicarse **antes** del argumento posicional.

Los tokens de flags de schematic siguen estas reglas:

- `--name=value` — entrada de tipo string; el valor se conserva textualmente (un `=` dentro del valor no se vuelve a dividir).
- `--name` — entrada booleana establecida en `true`.
- `--no-name` — entrada booleana establecida en `false`.
- Los tokens que no comienzan con `--` (palabras sueltas, flags de un solo guion) se omiten con una advertencia.
- Los nombres de flags duplicados se preservan en orden, con una advertencia.

### Flags

| Flag | Efecto |
|---|---|
| `--commit=<never\|always>` | Modo de escritura. Por defecto `always`. `ask` se acepta sintácticamente pero se rechaza — reservado para una versión futura. |
| `--dry-run` | Alias de `--commit=never`. Establecer `--dry-run` junto con un valor de `--commit` contradictorio es un error. |
| `--non-interactive` | Reservado — aún no implementado; emite una advertencia si se establece. |
| `--strict` | Reservado — aún no implementado; emite una advertencia si se establece. |
| `--force` | Reservado — aún no implementado; emite una advertencia si se establece. |
| `--auto-install` | Reservado — aún no implementado; emite una advertencia si se establece. |

**Limitación actual:** ningún motor respeta `--commit=never` todavía. El modo se resuelve y se transmite al motor, que aun así escribe — la CLI emite una advertencia cada vez que el modo resuelto no es `always`, de modo que una invocación con `--dry-run` nunca se confunde silenciosamente con una previsualización segura.

### Ejemplos

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

Genera el andamiaje de un nuevo schematic con archivos de factory y schema. Alias: `s`. Opera sobre el workspace anclado por `project-builder.json`. Solo CLI — no invoca ningún motor.

### Sinopsis

```sh
builder new schematic <name> [flags]
builder new s <name> [flags]
```

`<name>` es obligatorio y se valida contra metacaracteres de shell, separadores de ruta, bytes nulos y caracteres reservados.

### Qué hace

Dos modos, controlados por `--inline`.

**Modo path (por defecto)** — produce 4 salidas:

1. `schematics/<name>/factory.{ts,js}` — stub de factory (TypeScript o JavaScript según la detección de lenguaje). El stub es un default export: el execute en modo path resuelve `factory.{ts,js}#default` por convención.
2. `schematics/<name>/schema.json` — forma canónica v1 `{"properties": {}, "description": ""}`.
3. `schematics/<name>/schema.generated.ts` — interfaz de TypeScript autogenerada a partir de las `properties` de `schema.json` (independientemente de `--language`). Se omite con una advertencia cuando `@pbuilder/sdk` no está presente en el workspace.
4. `project-builder.json` — agrega `collections.default.<name>: { "path": "./schematics/<name>" }`.

**Modo inline (`--inline`)** — incrusta el schematic directamente dentro de `project-builder.json` bajo `collections.default.schematics.<name>`; no se crean archivos en `schematics/<name>/`. Se disparan advertencias suaves cuando una colección acumula 10 o más schematics inline, o cuando `project-builder.json` supera los 20KB después de la escritura.

La generación de tipos se delega a `pbuilder-codegen`, un binario incluido dentro de `@pbuilder/sdk`. Cuando el SDK no está instalado, el paso automático de codegen se omite con una advertencia en lugar de hacer fallar el andamiaje (`schema.generated.ts` queda desactualizado o ausente).

### Flags

| Flag | Efecto |
|---|---|
| `--force` | Sobrescribir un schematic existente con el mismo nombre. |
| `--dry-run` | Previsualizar las operaciones planificadas sin escribir ningún archivo. |
| `--inline` | Incrustar la definición del schematic en `project-builder.json` en lugar de crear archivos independientes. |
| `--language=<ts\|js>` | Forzar una factory en TypeScript o JavaScript. Autodetección por defecto: TS si existe `devDependencies.typescript` o `tsconfig.json`; en caso contrario recurre a TS con una advertencia. |
| `--extends=<@scope/pkg:base>` | Declarar un schematic base que este extiende. La gramática se aplica estrictamente (`@scope/pkg:collection`); el path traversal se rechaza. |

### Ejemplos

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

Para un recorrido guiado, ver [tu primer schematic](/es/getting-started/your-first-schematic/).

---

## `builder new collection`

Genera el andamiaje de una nueva colección de schematics con un `collection.json` esqueleto. Alias: `c`.

### Sinopsis

```sh
builder new collection <name> [flags]
builder new c <name> [flags]
```

### Qué hace

**Modo por defecto** — produce 2 salidas:

1. `schematics/<name>/collection.json` — esqueleto `{"version": 1, "schematics": {}}`.
2. `project-builder.json` — agrega `collections.<name>: { "path": "./schematics/<name>/collection.json" }`.

**Modo publicable (`--publishable`)** — produce el esqueleto de la colección más los stubs de ciclo de vida `add/` y `remove/` (cada uno con `factory.ts`, `schema.json` y `schema.generated.ts`), convirtiendo la colección en el esqueleto de un paquete npm publicable.

### Flags

| Flag | Efecto |
|---|---|
| `--force` | Sobrescribir una colección existente con el mismo nombre. |
| `--dry-run` | Previsualizar las operaciones planificadas sin escribir ningún archivo. |
| `--publishable` | Generar los stubs de ciclo de vida `add/` y `remove/`. |
| `--inline` | Incrustar la definición de la colección inline. Entra en conflicto con `--publishable` — combinarlos es un error de conflicto de modos. |

### Ejemplos

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

Inspecciona las colecciones y schematics registrados en el workspace de proyecto actual, a través de las tres formas de registro (modo path, modo colección, modo inline).

### Sinopsis

```sh
builder info [<collection>[:<schematic>]]
```

### Qué hace

El único argumento opcional selecciona una de tres formas:

| Forma | Resultado |
|---|---|
| `builder info` | Lista las colecciones registradas |
| `builder info <collection>` | Lista los schematics de una colección |
| `builder info <collection>:<schematic>` | Muestra el detalle completo de las entradas de un schematic |

`info` no tiene flags locales. Pasa el flag global `--output=json` para obtener salida legible por máquinas.

### Ejemplos

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

## Comandos aún no implementados

Los siguientes comandos están registrados en el binario y aparecen en `builder --help`, pero sus handlers son stubs: invocarlos termina con código 1 y el error `not_implemented` ("command not yet implemented").

| Comando | Propósito planificado |
|---|---|
| `builder add` | Generar un nuevo artefacto (componente, módulo, servicio) dentro de un workspace de proyecto existente ejecutando un schematic. Las entradas se validan contra su JSON schema antes de que ocurra cualquier cambio en archivos. |
| `builder remove` | Eliminar un artefacto generado del workspace del proyecto revirtiendo los cambios de archivos producidos por un `add` previo. Solo pueden eliminarse los artefactos rastreados en el manifiesto del workspace. |
| `builder sync` | Reconciliar un workspace de proyecto existente con su colección de schematics, aplicando las actualizaciones upstream sin perder las personalizaciones locales. |
| `builder validate` | Verificar que el workspace de proyecto actual cumpla con las restricciones, reglas de estructura de archivos y definiciones de schema de su colección de schematics; termina con código distinto de cero si se encuentran violaciones. |
| `builder skill update` | Actualizar las skills de schematics y extensiones registradas en el workspace de proyecto actual a sus últimas versiones publicadas. |

`builder skill` en sí es un grupo de comandos: invocado sin subcomando imprime su ayuda y termina con código 0.
