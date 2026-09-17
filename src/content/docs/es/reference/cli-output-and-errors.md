---
title: Salida y errores de la CLI
description: Cómo formatea su salida la CLI builder, qué variables de entorno y flags la controlan, y el contrato completo de códigos de error y códigos de salida.
sidebar:
  order: 2
---

La CLI `builder` es AI-first por diseño: cada comando tiene un modo JSON legible por máquinas, y cada error lleva un código estructurado con sugerencias accionables. Esta página documenta el contrato de salida de cara al usuario — formatos, temas, verbosidad — y la referencia completa de errores y códigos de salida.

## Formatos de salida

La CLI tiene dos formatos de salida, seleccionados por el flag global `--output`:

| Formato | Se selecciona con | Comportamiento |
|---|---|---|
| `pretty` | `--output=pretty`, o por defecto cuando stdout es una terminal | Salida legible para humanos, con tema aplicado: encabezados, rutas y líneas de éxito/advertencia/error renderizadas con el tema de color activo. |
| `json` | `--output=json`, o por defecto cuando stdout **no** es una terminal (pipes, CI) | NDJSON para CI/pipes y consumo por IA. Los envelopes legibles por máquinas se escriben en stdout; el "chrome" humano (advertencias, renderizado de eventos del motor) se dirige a stderr para que stdout lleve únicamente el envelope. |

Cuando `--output` no se establece, el formato se autodetecta desde la terminal: una TTY interactiva recibe `pretty`, un stdout redirigido o en pipe recibe `json`. Esto hace que `builder ... | jq` y las invocaciones en CI sean legibles por máquinas sin ningún flag adicional.

`builder init` acepta adicionalmente un flag booleano local `--json` que selecciona la misma salida NDJSON, y se combina con `--dry-run` para obtener un plan estructurado completo de cada operación sin escribir nada (ver la [guía de dry-run](/es/guides/dry-run/)).

### Ubicación de flags con `builder execute`

`builder execute` trata cada token posterior al argumento posicional `<collection>:<schematic>` como un flag crudo del schematic. Coloca `--output`, `--theme` y `--verbose` **antes** del posicional:

```sh
# Correct — --output is a CLI flag
builder --output=json execute default:my-component --name=button

# Here --output=./dist is passed through to the schematic, NOT to the CLI
builder execute default:my-component --output=./dist
```

## Verbosidad

`--verbose` (global, solo en modo texto) imprime la salida de diagnóstico completa — sanitizada — para fallas de subprocesos y del motor, y habilita líneas de log de nivel debug. Varios remedios de error sugieren re-ejecutar con `--verbose` para ver la salida completa del subproceso (por ejemplo tras una falla de instalación del gestor de paquetes o una falla de codegen). La salida JSON no se ve afectada por `--verbose`.

## Temas

La salida pretty se renderiza mediante una paleta semántica de colores de 8 tokens con variantes claras y oscuras. La apariencia se resuelve a través de una cadena de precedencia de tres niveles:

```
--theme flag  >  BUILDER_THEME env  >  auto-detect
```

| Precedencia | Fuente | Valores |
|---|---|---|
| Más alta | Flag `--theme` | `light`, `dark`, `auto` (por defecto) |
| Media | Variable de entorno `BUILDER_THEME` | `light`, `dark` |
| Más baja | Autodetección | Consulta el color de fondo de la terminal |

```sh
# Force light via environment variable
BUILDER_THEME=light builder info

# Flag wins over env (appearance = light)
BUILDER_THEME=dark builder --theme=light info
```

La autodetección es perezosa: un `--theme` o `BUILDER_THEME` explícito la omite por completo. En configuraciones inusuales de automatización con PTY, la consulta del color de fondo puede demorar el arranque hasta 5 segundos antes de recurrir al fallback — establece `BUILDER_THEME` para evitar la detección. Cuando stdout está en un pipe o la terminal no reporta soporte de color, la salida se degrada con gracia a texto plano.

## Contrato de errores

Cada error que emite la CLI incluye:

- un **`code`** estable y legible por máquinas (p. ej. `init_config_exists`),
- un **mensaje** legible para humanos, y
- una lista de **suggestions** no vacía — las entradas `Fix:` son remedios directos, las entradas `Note:` son contexto.

Algunos códigos también incluyen un **`reason`** que distingue variantes del mismo código, y un **`detail`** breve y sin rutas (por ejemplo, qué campo falló). Ambos aparecen en la salida JSON; las tablas siguientes indican el reason cuando cambia el remedio.

En modo texto, los errores se renderizan como un bloque fijo en **stderr**, independientemente de a dónde se redirija stdout. En modo JSON, `builder execute` escribe en su lugar un envelope de error JSON estructurado en stdout (y el bloque de texto se suprime), de modo que los consumidores automatizados siempre encuentran el error en el stream que están parseando.

Los prompts interactivos para entradas **sensibles** de un schematic se rechazan fuera de una TTY (`engine_non_tty_ask_unavailable`) — en scripts y CI, pasa el valor explícitamente con `builder execute <collection>:<schematic> --<name>=<value>`.

## Códigos de salida

Cada error terminal se resuelve en exactamente una familia de salida:

| Código | Familia | Significado |
|---|---|---|
| 0 | success | Sin error. |
| 1 | internal | Fail-closed — causa no clasificable, códigos `*_not_implemented`, y todo código no asignado de otra manera. |
| 2 | usage | Validación de entrada/flag/argumento/estado del workspace en la CLI. |
| 3 | config | La configuración declarada por el propio proyecto falta, está corrupta o escapa del workspace. |
| 4 | sdk | Falla en la capa del SDK (`@pbuilder/sdk` ausente o con versión incompatible). |
| 5 | engine | Falla en la capa del motor. |
| 130 | cancelled | SIGINT (Ctrl-C), siguiendo la convención de shell 128+2. |

La familia se deriva del error de CLI más externo en la cadena — nunca del código de salida propio de un subproceso envuelto.

## Referencia de códigos de error

Registro completo de códigos de error, agrupados por área. Cuando un código cubre varias situaciones distintas, cada variante de mensaje recibe su propia fila.

### General

| Código | Salida | Mensaje | Remedio |
|---|---|---|---|
| `cancelled` | 130 | run cancelled | Note: re-ejecuta el comando para intentarlo de nuevo |
| `cli_prompt_failed` | 1 | could not read your answer from the terminal | Fix: re-ejecuta en una terminal interactiva, o pasa el valor con `--<name>=<value>` |
| `cli_unknown_flag` | 2 | unrecognised command-line flag | Fix: ejecuta `--help` para ver los flags aceptados |
| `invalid_input` | 2 | input value invalid | Note: verifica el valor de la entrada contra su formato esperado |
| `not_implemented` | 1 | command not yet implemented | Note: este comando aún no está implementado |
| `collection_manifest_invalid` | 3 | collection manifest not found | Fix: verifica que `collection.json` exista en la ruta registrada |
| `collection_manifest_invalid` | 3 | collection manifest unparseable | Note: edita `collection.json` para corregir el error de sintaxis JSON |

### `builder init`

| Código | Salida | Mensaje | Remedio |
|---|---|---|---|
| `init_agent_file_ambiguous` | 2 | both AGENTS.md and CLAUDE.md already contain the pbuilder skill marker — ambiguous which file to update | Fix: ejecuta con `--force` para refrescar el bloque marcador en ambos archivos; o elimina el marcador de uno de los archivos manualmente y re-ejecuta |
| `init_config_exists` | 2 | project-builder.json already exists | Fix: ejecuta con `--force` para actualizar de forma segura — las colecciones, dependencias y settings existentes se preservan; o elimina `project-builder.json` manualmente y re-ejecuta |
| `init_dir_not_empty` | 2 | target directory is not empty | Fix: ejecuta con `--force` para inicializar de todos modos |
| `init_install_failed` | 3 | package manager install failed | Fix: usa `--no-install` para omitir el paso de instalación y ejecutarlo manualmente más tarde; o re-ejecuta con `--verbose` para ver la salida completa del subproceso |
| `init_marker_corrupt` | 3 | the pbuilder skill marker block in the agent file is malformed | Fix: cierra el bloque con `<!-- pbuilder:skill:end -->`, elimina las líneas de marcador duplicadas o huérfanas, y luego re-ejecuta |
| `init_not_implemented` | 1 | init mode not yet implemented | Note: este modo de init aún no está implementado |
| `init_package_manager_not_found` | 3 | package manager not found | Fix: ejecuta con `--package-manager` para seleccionar uno explícitamente |
| `init_skill_exists` | 2 | skill artefact set already exists (`.claude/skills/pbuilder/`) | Fix: ejecuta con `--force` para sobrescribir el conjunto completo de artefactos de skill |
| `invalid_input` | 2 | package.json is not valid JSON | Fix: corrige los errores de sintaxis de `package.json` y re-ejecuta |
| `invalid_input` | 2 | package.json `<field>` field is not a valid string map | Note: corrige el campo `devDependencies` o `scripts` (por ejemplo, un valor `null`) y re-ejecuta. Ver [Ediciones de `package.json`](/es/reference/cli-commands/#ediciones-de-packagejson) |

Un `init` fallido deja en disco las salidas escritas antes del fallo. Una vez corregida la causa, re-ejecuta con `--force`.

### `builder new`

| Código | Salida | Mensaje | Remedio |
|---|---|---|---|
| `new_codegen_failed` | 4 | @pbuilder/sdk installation could not be resolved for code generation | Fix: reinstala el SDK: `bun add -d @pbuilder/sdk`; o re-ejecuta con `--verbose` para ver la salida completa del subproceso |
| `new_codegen_failed` | 4 | pbuilder-codegen failed | Fix: re-ejecuta con `--verbose` para ver la salida del codegen. Si indica `refusing symbolic-link output`, reinstalar no ayuda — ver [Salidas que son enlaces simbólicos](/es/guides/type-generation/#salidas-que-son-enlaces-simbólicos) |
| `new_collection_exists` | 2 | collection already exists | Fix: ejecuta con `--force` para sobrescribir |
| `new_invalid_extends` | 2 | `--extends` value does not match the required grammar | Note: `--extends` debe tener la forma `@scope/pkg:collection` |
| `new_invalid_language` | 2 | `--language` value is not supported | Note: `--language` acepta `ts` o `js` |
| `new_invalid_name` | 2 | schematic name is invalid | Note: los nombres no pueden contener separadores de ruta, metacaracteres de shell ni bytes nulos |
| `new_mode_conflict` | 2 | incompatible flags combined | Note: `--inline`, `--force` y `--publishable` no pueden combinarse de esta manera |
| `new_node_not_found` | 3 | no Node.js binary found | Fix: instala Node.js >= 18 y asegúrate de que esté en el PATH, o establece `NODE_BINARY` |
| `new_not_implemented` | 1 | new mode not yet implemented | Note: este modo de new aún no está implementado |
| `new_schematic_exists` | 2 | schematic already exists | Fix: ejecuta con `--force` para sobrescribir |

### `builder execute`

| Código | Salida | Mensaje | Remedio |
|---|---|---|---|
| `execute_ambiguous_registration` | 2 | registration is ambiguous | Note: resuelve la colección o el schematic a un único modo de registro |
| `execute_collection_not_found` | 2 | collection not found in project-builder.json | Note: verifica en `project-builder.json` el nombre de la colección registrada |
| `execute_commit_mode_unsupported` | 2 | commit mode is not supported | Fix: usa `--commit=never` o `--commit=always` (o `--dry-run` para `never`) |
| `execute_invalid_factory_pointer` | 2 | schematic's factory pointer does not parse | Note: edita el factory de `collection.json` a `<module>#<export>` |
| `execute_invalid_factory_pointer` | 2 | schematic has both factory.ts and factory.js — ambiguous | Note: elimina `factory.ts` o `factory.js` de modo que quede solo uno |
| `execute_invalid_factory_pointer` | 2 | schematic is missing a factory.ts or factory.js file | Note: crea `factory.ts` o `factory.js` en la raíz del schematic |
| `execute_invalid_factory_pointer` | 2 | schematic's factory pointer is empty or missing in collection.json | Note: establece el factory de `collection.json` a `<module>#<export>` |
| `execute_invalid_input_value` | 2 | input value is invalid | Note: verifica el tipo de la entrada, sus valores de enum y si es de tipo escalar |
| `execute_manifest_path_escape` | 3 | manifest-derived path resolves outside the workspace root | Note: busca en el manifiesto una ruta que escape del workspace del proyecto. Si se quitó `sdk.root` — o `--sdk-root` / `BUILDER_SDK_ROOT` ya no están definidos — `node_modules/@pbuilder/sdk` puede ser un enlace sobrante — confirma que es un symlink, nunca un directorio, y bórralo |
| `execute_manifest_path_escape` (`path_escapes_manifest_root`) | 3 | manifest-derived path resolves outside the named manifest root | Note: busca en el manifiesto una ruta que escape de la raíz del manifiesto indicada |
| `execute_manifest_path_escape` (`sdk_node_modules_escapes_workspace`) | 3 | node_modules is a symlink that resolves outside the workspace root | Note: verifica si `node_modules` es un symlink que apunta fuera del workspace del proyecto; la nota anterior sobre el enlace sobrante de `sdk.root` también aplica |
| `execute_missing_required_inputs` | 2 | missing required input(s) | Fix: `builder execute <collection>:<schematic> --<name>=<value>` |
| `execute_project_not_initialized` | 3 | project-builder.json not found | Fix: ejecuta `builder init` para crear `project-builder.json`; o re-ejecuta con `--manifest` (o `BUILDER_MANIFEST`) indicando un directorio que ya tenga uno |
| `execute_project_not_initialized` | 3 | project-builder.json exists but could not be parsed | Note: edita `project-builder.json` para corregir el error de sintaxis JSON |
| `execute_schema_invalid` | 3 | schema.json is present but could not be parsed | Note: edita `schema.json` para corregir el error de sintaxis JSON |
| `execute_schematic_not_found` | 2 | schematic not found in collection | Note: verifica en el manifiesto de la colección el nombre del schematic registrado |
| `execute_sdk_link_failed` | 4 | varía según el reason | Ver [Errores del SDK](#errores-del-sdk) |
| `execute_sdk_link_path_conflict` | 4 | varía según el reason | Ver [Errores del SDK](#errores-del-sdk) |
| `execute_sdk_not_installed` | 4 | varía según el reason | Ver [Errores del SDK](#errores-del-sdk) |
| `execute_sdk_root_invalid` | 4 | varía según el reason | Ver [Errores del SDK](#errores-del-sdk) |
| `execute_sdk_version_mismatch` | 4 | varía según el reason | Ver [Errores del SDK](#errores-del-sdk) |
| `execute_unsupported_registration` | 2 | schematic is registered in a mode execute does not support | Note: registra el schematic en modo path o modo colección |
| `execution_failed` | 5 | schematic execution failed | Note: revisa la salida propia del schematic más arriba para encontrar la causa subyacente |

### Errores del SDK

`builder execute` verifica el SDK del workspace antes de ejecutar nada (ver [Requisito del SDK](/es/reference/cli-commands/#requisito-del-sdk) y [Origen del SDK](/es/reference/cli-commands/#origen-del-sdk)). Cada reason requiere una reparación distinta — solo `sdk_absent` significa que el SDK realmente falta.

#### Instalación local

| Código | Reason | Salida | Mensaje | Reparación |
|---|---|---|---|---|
| `execute_sdk_not_installed` | `sdk_absent` | 4 | @pbuilder/sdk is not installed in this workspace | Provee un SDK compatible en `node_modules/@pbuilder/sdk` (ver más abajo) |
| `execute_sdk_not_installed` | `sdk_dist_incomplete` | 4 | local @pbuilder/sdk distribution is incomplete | El paquete está, pero faltan archivos de distribución requeridos — reinstálalo |
| `execute_sdk_not_installed` | `sdk_installation_unreadable` | 4 | local @pbuilder/sdk installation could not be read; check permissions and broken links | Revisa los permisos y los symlinks rotos en `node_modules/@pbuilder/sdk` |
| `execute_sdk_version_mismatch` | `sdk_requirement_invalid` | 4 | @pbuilder/sdk requirement is invalid; correct the selected declaration or configuration | Corrige el valor indicado en `detail`, por ejemplo `project-builder.json.sdk.version: expected a numeric version floor` |
| `execute_sdk_version_mismatch` | `sdk_requirement_unreadable` | 4 | @pbuilder/sdk requirement could not be read; check package.json permissions and size | Verifica que el `package.json` del workspace sea legible y no exceda el tamaño permitido |
| `execute_sdk_version_mismatch` | `sdk_version_unparseable` | 4 | installed @pbuilder/sdk version is invalid; check the local package.json | Inspecciona el `version` de `node_modules/@pbuilder/sdk/package.json` |
| `execute_sdk_version_mismatch` | `sdk_version_below_floor` | 4 | installed @pbuilder/sdk version is below the selected requirement; choose a compatible version | Instala una versión que cumpla el requisito seleccionado, o corrige el requisito |

La CLI no detecta tu gestor de paquetes para estos errores: sus sugerencias listan un comando de instalación local por gestor, y tú eliges uno. Estos comandos modifican `package.json` y pueden modificar el lockfile:

| Gestor de paquetes | Comando |
|---|---|
| npm | `npm install --save-dev @pbuilder/sdk` |
| pnpm | `pnpm add -D @pbuilder/sdk` |
| Yarn | `yarn add --dev @pbuilder/sdk` |
| Bun | `bun add -D @pbuilder/sdk` |

Fija una versión cuando necesites instalaciones reproducibles. Las sugerencias también ofrecen la alternativa de apuntar [`sdk.root`](/es/reference/cli-commands/#sdk-externo-sdkroot) a un directorio `@pbuilder/sdk` existente. Para proveer un SDK sin declararlo, ver [Evaluar sin adoptar el SDK](/es/guides/evaluate-without-sdk/).

#### Raíz externa

Estos códigos solo aparecen cuando se indica una raíz externa — con `--sdk-root`, `BUILDER_SDK_ROOT` o `sdk.root` en `project-builder.json`. Sus mensajes dicen `sdk.root` sea cual sea de las tres la que indicó la raíz. `execute_sdk_version_mismatch` aplica a una raíz externa igual que a una instalación local. Ningún mensaje, detail ni campo JSON contiene la ruta configurada: las ubicaciones se reportan respecto de la raíz, como `the configured root itself` o `2 levels above sdk.root`.

| Código | Reason | Salida | Mensaje | Reparación |
|---|---|---|---|---|
| `execute_sdk_root_invalid` | `sdk_root_value_invalid` | 4 | sdk.root in project-builder.json must be a non-empty string path | Define `"sdk": {"root": "<directory>"}` — absoluta, o relativa a `project-builder.json` |
| `execute_sdk_root_invalid` | `sdk_root_unsupported_scheme` | 4 | sdk root is not a supported location — a URL or drive letter is not accepted | Apunta `--sdk-root` (o `BUILDER_SDK_ROOT`) a un directorio local. Solo esas dos fuentes pueden producirlo |
| `execute_sdk_root_invalid` | `sdk_root_unresolvable` | 4 | sdk.root does not resolve to a readable directory | Apunta `sdk.root` a un directorio de paquete `@pbuilder/sdk` existente y legible |
| `execute_sdk_root_invalid` | `sdk_root_package_mismatch` | 4 | the directory named by sdk.root is not @pbuilder/sdk | Apúntalo al directorio del paquete cuyo `package.json` tiene `name` `@pbuilder/sdk` — no a su padre |
| `execute_sdk_root_invalid` | `sdk_root_dist_incomplete` | 4 | the @pbuilder/sdk distribution at sdk.root is incomplete | Reinstala o recompila el SDK para que existan `dist/bin/pbuilder-runner.js` y `dist/transport` |
| `execute_sdk_root_invalid` | `sdk_root_dependencies_unresolvable` | 4 | the @pbuilder/sdk at sdk.root cannot load its own dependencies | `detail` nombra la dependencia (por ejemplo `ts-morph`). Apunta `sdk.root` a una instalación completa, como la que crea `bun add -g @pbuilder/sdk` — no a una caché del gestor de paquetes |
| `execute_sdk_root_invalid` | `sdk_root_writable_by_others` | 4 | sdk.root itself is writable by its group or by any user | Aplica `chmod go-w` a la raíz para que solo su dueño pueda escribir |
| `execute_sdk_root_invalid` | `sdk_ancestor_world_writable` | 4 | a directory above sdk.root is writable by any user and is not sticky | `detail` indica la profundidad. Aplica `chmod o-w` a ese directorio, o mueve el SDK bajo un directorio en el que solo tú puedas escribir |
| `execute_sdk_root_invalid` | `sdk_root_untrusted_owner` | 4 | sdk.root, or a directory above it, is owned by another user | Mueve el SDK bajo una ruta que te pertenezca a ti o a root |
| `execute_sdk_link_path_conflict` | `sdk_root_local_install_present` | 4 | a real @pbuilder/sdk is already installed at node_modules/@pbuilder/sdk and differs from the configured SDK root | Borra `node_modules/@pbuilder/sdk` para usar la raíz configurada, o deja de configurarla (`--sdk-root`, `BUILDER_SDK_ROOT` o `sdk.root`) para usar el SDK instalado |
| `execute_sdk_link_path_conflict` | `sdk_link_path_occupied` | 4 | node_modules/@pbuilder/sdk is a regular file, so the SDK link cannot be created | Borra ese archivo y vuelve a ejecutar |
| `execute_sdk_link_path_conflict` | `sdk_link_path_dangling` | 4 | node_modules/@pbuilder/sdk is a link to a target that no longer exists | Borra el enlace roto (confirma que es un symlink, nunca un directorio) y vuelve a ejecutar |
| `execute_sdk_link_path_conflict` | `sdk_link_path_invalid_package` | 4 | node_modules/@pbuilder/sdk is a directory that is not a usable @pbuilder/sdk package | Elimina o reinstala `node_modules/@pbuilder/sdk` y vuelve a ejecutar |
| `execute_sdk_link_path_conflict` | `sdk_scope_dir_occupied` | 4 | node_modules/@pbuilder is a file or a link, so the SDK link cannot be placed inside it | Reemplaza `node_modules/@pbuilder` por un directorio real y vuelve a ejecutar |
| `execute_sdk_link_path_conflict` | `sdk_node_modules_not_a_directory` | 4 | node_modules is a regular file, so the SDK link cannot be created | Borra o renombra ese archivo para que `node_modules` pueda ser un directorio |
| `execute_sdk_link_path_conflict` | `sdk_node_modules_unresolvable` | 4 | node_modules is a symlink that does not resolve to a directory | Borra o repara el symlink `node_modules` y vuelve a ejecutar |
| `execute_sdk_link_failed` | `sdk_link_write_failed` | 4 | the SDK link node_modules/@pbuilder/sdk could not be written | Verifica los permisos de escritura en `node_modules` y `node_modules/@pbuilder` y vuelve a ejecutar |

| Advertencia | Significado |
|---|---|
| `warn_sdk_root_group_writable` | Un directorio por encima de la raíz es escribible por el grupo, así que cualquiera de ese grupo podría reemplazar el SDK. La ejecución continúa; el mensaje indica la profundidad y el remedio — `chmod g-w` a ese directorio, o mover el SDK bajo un directorio en el que solo tú puedas escribir. Las instalaciones globales bajo un prefijo compartido, como el de Homebrew, suelen dispararla. |
| `warn_sdk_root_ambient` | La raíz vino de `BUILDER_SDK_ROOT`, no de `--sdk-root`. El mensaje nombra la variable, nunca la ruta — revisa la propia variable para saber qué SDK se ejecutó. |

### `pbuilder-codegen` no se encuentra o se ejecuta otra versión

No es un error de `builder`: viene de tu ejecutor de paquetes (`npx`, `bunx`) cuando regeneras tipos a mano. Dos situaciones se parecen:

| Situación | Qué pasa |
|---|---|
| `@pbuilder/sdk` no está instalado | El ejecutor no encuentra el binario — instala el SDK |
| El SDK viene de una raíz externa (`sdk.root`, `--sdk-root` o `BUILDER_SDK_ROOT`) | `node_modules/@pbuilder/sdk` es un enlace que ningún gestor de paquetes instaló, así que no hay shim `node_modules/.bin/pbuilder-codegen`. El ejecutor reporta que falta el binario aunque el SDK funciona — o, si hay un SDK instalado globalmente, `npx` puede ejecutar en silencio **esa copia global**, posiblemente de otra versión. Las versiones recientes de pnpm instalan antes de `pnpm exec`, lo que escribe un lockfile en el proyecto |

Con una raíz externa, ejecuta el script directamente — ver [Generación de tipos con `sdk.root`](/es/guides/type-generation/#cuando-el-sdk-viene-de-sdkroot). `builder new schematic` no necesita el shim: regenera los tipos desde `sdk.root` por su cuenta.

### Raíz del manifiesto

Errores y advertencias de [`--manifest` / `BUILDER_MANIFEST`](/es/guides/external-collections/). Las ubicaciones en `detail` son relativas a la raíz del manifiesto, como `2 levels above the manifest root`.

| Código | Reason | Salida | Mensaje | Remedio |
|---|---|---|---|---|
| `manifest_root_unsupported_scheme` | `manifest_root_unsupported_scheme` | 2 | manifest root is not a supported location — a URL or drive letter is not accepted | Apunta `--manifest` (o `BUILDER_MANIFEST`) a un directorio local o a un archivo `project-builder.json` |
| `manifest_root_unresolvable` | `manifest_root_unresolvable` | 3 | manifest root does not resolve to a usable directory or project-builder.json file | Apúntalo a un directorio o archivo `project-builder.json` existente y legible |
| `manifest_root_untrusted` | `manifest_root_untrusted_owner` | 3 | the manifest root is owned by another user | Mueve la raíz del manifiesto bajo una ruta que te pertenezca a ti o a root |
| `manifest_root_untrusted` | `manifest_root_writable_by_others` | 3 | the manifest root itself is writable by its group or by any user | Aplica `chmod go-w` a la raíz del manifiesto para que solo su dueño pueda escribir |
| `manifest_root_untrusted` | `manifest_root_ancestor_world_writable` | 3 | a directory above the manifest root is writable by its group, or by any user without the sticky bit | Aplica `chmod o-w` (o `g-w`) a ese directorio, o mueve la raíz del manifiesto bajo un directorio en el que solo tú puedas escribir. Una raíz bajo `/tmp` cae aquí |
| `manifest_root_untrusted` | `manifest_root_is_filesystem_root` | 3 | the filesystem root cannot be named as a manifest root | Apúntalo al directorio concreto que contiene `project-builder.json` |
| `manifest_root_untrusted` | `manifest_root_is_home_directory` | 3 | your home directory cannot be named as a manifest root | Apúntalo a un directorio dentro de tu home, no al home en sí |
| `manifest_root_unsupported_command` | `manifest_root_command_unsupported` | 2 | this command does not support --manifest | `--manifest` solo se admite en `execute`, `info` y `new schematic` |
| `manifest_scoped_authoring_refused` | `manifest_scoped_authoring_refused` | 2 | new schematic refuses to author under a named external manifest root | Haz `cd` a ese directorio y ejecuta `builder new schematic` allí |
| `collection_absolute_path` | `collection_path_absolute` | 3 | a manifest-registered path must be relative to the manifest's own root | Haz que el `path` registrado sea relativo a la raíz del manifiesto |

| Advertencia | Significado |
|---|---|
| `warn_manifest_root_ambient` | La raíz del manifiesto vino de `BUILDER_MANIFEST`, no de un flag. El mensaje indica el directorio resuelto. |
| `warn_manifest_sdk_root_ignored` | El manifiesto externo declara un `sdk.root`; se ignora. El mensaje dice que se usó el `@pbuilder/sdk` instalado en el directorio de trabajo, pero `--sdk-root` o `BUILDER_SDK_ROOT` siguen aportando el SDK cuando están definidos. |

Una ejecución que falla con `engine_native_developer_fault` y una nota sobre un *split module graph* al usar `--manifest` significa que la raíz del manifiesto, o un directorio por encima, tiene su propio `@pbuilder/sdk`. Ver [Colecciones externas](/es/guides/external-collections/#prepara-un-directorio-compartido-de-colecciones).

### `builder info`

| Código | Salida | Mensaje | Remedio |
|---|---|---|---|
| `info_ambiguous_registration` | 2 | registration is ambiguous | Note: resuelve la colección a un único modo de registro |
| `info_collection_not_found` | 2 | collection not found in project-builder.json | Note: verifica en `project-builder.json` el nombre de la colección registrada |
| `info_invalid_factory_pointer` | 3 | schematic's factory pointer is empty or missing | Note: edita el factory de `collection.json` a `<module>#<export>` |
| `info_invalid_factory_pointer` (`path_escapes_manifest_root`) | 3 | schematic's registered path, factory module, or schema.json resolves outside the named manifest root | Note: mantén cada ruta registrada dentro de la raíz del manifiesto |
| `info_manifest_invalid` | 3 | collection manifest not found | Fix: verifica que `collection.json` exista en la ruta registrada |
| `info_manifest_invalid` | 3 | collection manifest could not be parsed | Note: edita `collection.json` para corregir el error de sintaxis JSON |
| `info_project_not_initialized` | 3 | project-builder.json not found | Fix: ejecuta `builder init` para crear `project-builder.json`; o re-ejecuta con `--manifest` (o `BUILDER_MANIFEST`) indicando un directorio que ya tenga uno |
| `info_project_not_initialized` | 3 | project-builder.json exists but could not be parsed | Note: edita `project-builder.json` para corregir el error de sintaxis JSON |
| `info_schema_invalid` | 3 | schema.json is missing or could not be parsed | Note: asegúrate de que `schema.json` exista en la raíz del schematic y sea JSON válido |
| `info_schematic_not_found` | 2 | schematic not found in collection | Note: verifica en el manifiesto de la colección el nombre del schematic registrado |

### Motor

| Código | Salida | Mensaje | Remedio |
|---|---|---|---|
| `engine_non_tty_ask_unavailable` | 2 | sensitive input requires an interactive session | Fix: ejecuta en una terminal interactiva, o proporciona el valor con `builder execute <collection>:<schematic> --<name>=<value>` |
| `engine_not_found` | 5 | schematics engine binary not found | Fix: instala la CLI de Angular Schematics: `npm install -g @angular-devkit/schematics-cli` |
| `engine_version_mismatch` | 5 | schematics engine version below the required floor | Fix: actualiza `@angular-devkit/schematics-cli` a la versión requerida |
| `engine_native_commit_mode_unsupported` | 5 | the native engine adapter does not support dry-run yet | Note: hoy solo se soporta `CommitMode: always` |
| `engine_native_developer_fault` | 5 | native engine execution failed due to a developer-facing fault in the schematic or its inputs | Note: revisa las escrituras de archivos y las entradas del schematic para encontrar la causa subyacente |
| `engine_native_invalid_factory_url` | 5 | factory URL is empty or malformed | Note: esto indica un defecto interno de cableado en la resolución del factory pointer |
| `engine_native_invalid_plan` | 5 | execute request has no pre-flight plan | Note: esto indica un defecto interno de cableado — el pre-flight debe ejecutarse antes del adaptador del motor nativo |
| `engine_native_invalid_sdk_anchor` | 5 | execute plan has no resolved SDK location | Note: esto indica un defecto interno de cableado — el pre-flight debe ejecutarse antes del adaptador del motor nativo |
| `engine_native_provisioning_failed` | 5 | the native engine's runtime could not be provisioned | Note: verifica el acceso a la red, el espacio en disco y la verificación de binarios para el runtime del motor nativo |
| `engine_native_system_fault` | 5 | native engine system fault | Note: esto indica una falla de sistema del lado del motor — re-ejecuta y repórtala si persiste |
| `engine_native_workspace_inconsistent` | 5 | the workspace may be partially written and is in an inconsistent state | Note: inspecciona el workspace manualmente antes de re-ejecutar esta operación |
| `engine_spurious_cancellation` | 5 | engine reported a cancellation with no genuine signal behind it | Note: esto indica un defecto del lado del motor — re-ejecuta y repórtalo si persiste |
| `engine_stream_ended_without_terminal` | 5 | engine event stream ended without a terminal event | Note: esto indica un defecto del lado del motor — re-ejecuta y repórtalo si persiste |
