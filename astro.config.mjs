// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import favicons from 'astro-favicons';

// https://astro.build/config
export default defineConfig({
	site: 'https://schematics.pbuilder.dev',
	integrations: [
		starlight({
			title: 'Project Builder Documentation',
			description:
				'Documentation for Project Builder — build, extend, and automate project scaffolding with schematics.',
			logo: {
				light: './src/assets/logo-light.svg',
				dark: './src/assets/logo-dark.svg',
				replacesTitle: true,
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
					borderRadius: '0.5rem',
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
			components: {
				Head: './src/components/Head.astro',
				TableOfContents: './src/components/TableOfContents.astro',
			},
			customCss: ['./src/styles/colors.css', './src/styles/theme.css', './src/styles/custom.css'],
			sidebar: [
				{ label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
				{ label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
			],
		}),
		favicons(),
	],
});
