// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';
import favicons from 'astro-favicons';

// https://astro.build/config
export default defineConfig({
	site: 'https://schematics.pbuilder.dev',
	integrations: [
		starlight({
			title: 'Project Builder',
			description:
				'Documentation for Project Builder — build, extend, and automate project scaffolding with schematics.',
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
						'Deterministic code generation through typed, testable schematics — CLI, SDK, and engine.',
					details:
						'Schematics are typed file-mutation programs: seven mutation verbs, Go text/template templating with {= =} delimiters, AST-aware TypeScript/React dialects, and an in-memory testing harness.',
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
				{ label: 'Start Here', items: [{ autogenerate: { directory: 'getting-started' } }] },
				{ label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
				{ label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
			],
		}),
		favicons(),
	],
});
