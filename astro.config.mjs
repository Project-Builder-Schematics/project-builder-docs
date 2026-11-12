// @ts-check
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';
import favicons from 'astro-favicons';

const locales = {
	root: { label: 'English', lang: 'en' },
	es: { label: 'Español', lang: 'es' },
};

/** @param {string} url */
function lastCommitDate(url) {
	const slug = new URL(url).pathname.replace(/^\/|\/$/g, '');
	// Untranslated pages are served from the root-locale file, so fall back to it.
	const slugs = [slug, slug.replace(/^es(\/|$)/, '')];
	const file = slugs
		.map((s) => `src/content/docs/${s || 'index'}`)
		.flatMap((base) => [`${base}.mdx`, `${base}.md`, `${base}/index.mdx`, `${base}/index.md`])
		.find(existsSync);
	if (!file) return undefined;
	const date = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { encoding: 'utf8' }).trim();
	return date || undefined;
}

// https://astro.build/config
export default defineConfig({
	site: 'https://schematics.pbuilder.dev',
	redirects: {
		'/guides/dry-run': '/guides/pending-directives/',
		'/es/guides/dry-run': '/es/guides/pending-directives/',
	},
	integrations: [
		starlight({
			title: 'Project Builder',
			description:
				'Documentation for Project Builder — build, extend, and automate project scaffolding with schematics.',
			defaultLocale: 'root',
			locales,
			logo: {
				src: './src/assets/logo.svg',
			},
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/Project-Builder-Schematics/project-builder-docs',
				},
				{ icon: 'x.com', label: 'X', href: 'https://twitter.com/SForHumans' },
			],
			expressiveCode: {
				styleOverrides: {
					borderRadius: '0.75rem',
					borderColor: 'var(--sl-color-hairline, #23252a)',
					codeFontFamily: "'JetBrains Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
					frames: {
						shadowColor: 'transparent',
					},
				},
			},
			head: [
				{ tag: 'meta', attrs: { name: 'robots', content: 'index, follow' } },
				{
					tag: 'meta',
					attrs: {
						name: 'google-site-verification',
						content: '-OlG3l1BfQuKpnSEE8eYLs9xbqFBoZxt2cPpiFUMMoo',
					},
				},
			],
			plugins: [
				starlightLlmsTxt({
					projectName: 'Project Builder',
					description:
						'Deterministic code generation for AI coding agents and developers. The agent picks a typed, testable schematic and its inputs; the schematic writes the same files on every run. Now in beta.',
					details:
						'Schematics are typed file-mutation programs: seven mutation verbs, Go text/template templating with {= =} delimiters, AST-aware dialects for TypeScript, React, Angular, NestJS, CSS, JSON and YAML, and an in-memory testing harness. `builder init` installs an agent skill and an AGENTS.md or CLAUDE.md reference block; `builder execute` writes NDJSON when stdout is not a terminal and returns typed exit codes. See /guides/ai-agents/ for how an agent uses Project Builder.',
				}),
			],
			components: {
				Head: './src/components/Head.astro',
				TableOfContents: './src/components/TableOfContents.astro',
			},
			customCss: [
				'@fontsource-variable/inter',
				'@fontsource-variable/jetbrains-mono',
				'./src/styles/theme.css',
			],
			sidebar: [
				{
					label: 'Start Here',
					translations: { es: 'Primeros pasos' },
					collapsed: false,
					items: [{ autogenerate: { directory: 'getting-started' } }],
				},
				{
					label: 'Guides',
					translations: { es: 'Guías' },
					collapsed: false,
					items: [{ autogenerate: { directory: 'guides' } }],
				},
				{
					label: 'Reference',
					translations: { es: 'Referencia' },
					collapsed: false,
					items: [{ autogenerate: { directory: 'reference' } }],
				},
				{
					label: 'Roadmap',
					translations: { es: 'Roadmap' },
					link: '/roadmap/',
				},
				{
					label: 'Workbenches ↗',
					link: 'https://hyperxq.github.io/Project-Builder-workbenches-/',
					attrs: { target: '_blank' },
				},
			],
		}),
		// Registering sitemap here replaces Starlight's built-in one, so the i18n mapping is repeated.
		sitemap({
			i18n: {
				defaultLocale: 'root',
				locales: Object.fromEntries(Object.entries(locales).map(([key, { lang }]) => [key, lang])),
			},
			serialize: (item) => ({ ...item, lastmod: lastCommitDate(item.url) }),
		}),
		favicons(),
	],
});
