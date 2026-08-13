# Project Builder Documentation

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

The documentation site for [Project Builder](https://github.com/Project-Builder-Schematics/project-builder-sdk) — deterministic code generation through typed, testable schematics.

**Live at [schematics.pbuilder.dev](https://schematics.pbuilder.dev)** · English and [Spanish](https://schematics.pbuilder.dev/es/) · [Roadmap](https://schematics.pbuilder.dev/roadmap/)

## Stack

- [Astro 7](https://astro.build) + [Starlight](https://starlight.astro.build) with a Linear-inspired custom theme (dark by default, light supported)
- Per-page Open Graph images generated at build time (`astro-og-canvas`)
- [`llms.txt`](https://schematics.pbuilder.dev/llms.txt) / [`llms-full.txt`](https://schematics.pbuilder.dev/llms-full.txt) so AI agents can consume the whole documentation in one fetch (`starlight-llms-txt`)
- Pagefind full-text search, favicons pipeline, pan-and-zoom lightbox for diagrams

## Structure

```
src/
├── assets/            logos, mascot, hand-drawn SVG architecture diagrams
├── components/        Head (OG + theme default + lightbox), TableOfContents, CoffeeButton
├── content/docs/      English content (getting-started/, guides/, reference/, roadmap)
│   └── es/            Spanish translations, same tree
└── styles/theme.css   the entire theme: tokens, panels, lightbox, side-panel toggles
```

Content pages are Markdown/MDX; each file maps to a route. Spanish lives under `src/content/docs/es/` mirroring the English tree — untranslated pages fall back to English automatically.

## Development

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # production build to ./dist/
npx astro check    # type-check content and components
```

## Deployment

Every push to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`, served on the custom domain `schematics.pbuilder.dev`.

## Contributing

Found an issue or want to improve a page? [Open an issue](https://github.com/Project-Builder-Schematics/project-builder-docs/issues/new) or [start a discussion](https://github.com/Project-Builder-Schematics/project-builder-docs/discussions/new/choose).

## Related repositories

- [`project-builder-sdk`](https://github.com/Project-Builder-Schematics/project-builder-sdk) — the TypeScript authoring SDK
- [`project-builder-cli`](https://github.com/Project-Builder-Schematics/project-builder-cli) — the `builder` CLI and engine
- [Workbenches](https://hyperxq.github.io/Project-Builder-workbenches-/) — real projects proving schematics in the field
