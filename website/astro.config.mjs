// @ts-check
import { readFileSync } from 'node:fs';

import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://conduit.almasix.com',
	base: '/',
	devToolbar: { enabled: false },
	integrations: [
		starlight({
			title: 'Conduit',
			description:
				'Server-driven reactive components for Almasix — Prism views, Alpine $wire, morph updates that feel like pure JS.',
			logo: {
				light: './src/assets/almasix-banner-light.svg',
				dark: './src/assets/almasix-banner-dark.svg',
				alt: 'Almasix',
				replacesTitle: true,
			},
			favicon: '/favicon.svg',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/almasix-dev/almasix-conduit' },
			],
			editLink: {
				baseUrl: 'https://github.com/almasix-dev/almasix-conduit/edit/main/website/',
			},
			customCss: ['./src/styles/custom.css'],
			components: {
				Header: './src/components/Header.astro',
				PageFrame: './src/components/PageFrame.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			expressiveCode: {
				themes: ['one-dark-pro'],
				useStarlightDarkModeSwitch: false,
				useStarlightUiThemeColors: false,
				// Must stay true on Astro 7 / Sätteri: inlining puts CSS in a
				// set:html attribute, and `pre > code` in that CSS closes the
				// <style> tag early — frames go transparent, copy chrome breaks.
				emitExternalStylesheet: true,
				styleOverrides: {
					borderRadius: '0.85rem',
					borderWidth: '1px',
					codeFontFamily: "'JetBrains Mono', ui-monospace, monospace",
					codeFontSize: '0.9rem',
					codeBackground: '#282c34',
					codeForeground: '#abb2bf',
					frames: {
						shadowColor: 'rgba(0, 0, 0, 0.4)',
						editorBackground: '#282c34',
						terminalBackground: '#282c34',
					},
				},
			},
			head: [
				{
					tag: 'link',
					attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				},
				{
					tag: 'link',
					attrs: {
						rel: 'preconnect',
						href: 'https://fonts.gstatic.com',
						crossorigin: true,
					},
				},
				{
					tag: 'script',
					content: readFileSync('./src/scripts/sidebar-accordion.js', 'utf8'),
				},
				{
					tag: 'meta',
					attrs: { property: 'og:image', content: 'https://conduit.almasix.com/og.png' },
				},
				{
					tag: 'meta',
					attrs: { property: 'og:image:width', content: '1200' },
				},
				{
					tag: 'meta',
					attrs: { property: 'og:image:height', content: '630' },
				},
				{
					tag: 'meta',
					attrs: { property: 'og:image:alt', content: 'Almasix Conduit — Almasix' },
				},
				{
					tag: 'meta',
					attrs: { name: 'twitter:image', content: 'https://conduit.almasix.com/og.png' },
				},
				{
					tag: 'meta',
					attrs: { name: 'theme-color', content: '#F1511B' },
				},
				{
					tag: 'script',
					attrs: { type: 'application/ld+json' },
					content: "{\"@context\": \"https://schema.org\", \"@graph\": [{\"@type\": \"WebSite\", \"@id\": \"https://conduit.almasix.com/#website\", \"url\": \"https://conduit.almasix.com/\", \"name\": \"Almasix Conduit\", \"description\": \"Server-driven reactive components for Almasix \\u2014 Prism views, Alpine $wire, and morph updates.\", \"publisher\": {\"@id\": \"https://almasix.com/#organization\"}, \"inLanguage\": \"en\"}, {\"@type\": \"SoftwareApplication\", \"@id\": \"https://conduit.almasix.com/#software\", \"name\": \"Almasix Conduit\", \"applicationCategory\": \"DeveloperApplication\", \"url\": \"https://conduit.almasix.com/\", \"isPartOf\": {\"@id\": \"https://almasix.com/#software\"}, \"publisher\": {\"@id\": \"https://almasix.com/#organization\"}}]}",
				},

			],
			sidebar: [
				{ label: 'Home', slug: 'index' },
				{
					label: 'Conduit',
					items: [
						{ label: 'Installation', slug: 'installation' },
						{ label: 'Quick start', slug: 'quick-start' },
						{ label: 'Embedding', slug: 'embedding' },
						{ label: 'Components', slug: 'components' },
						{ label: 'Full-page components', slug: 'full-page-components' },
						{ label: 'Wire protocol', slug: 'wire-protocol' },
						{ label: 'Directives', slug: 'directives' },
						{ label: 'Alpine and islands', slug: 'alpine-and-islands' },
						{ label: 'Configuration', slug: 'configuration' },
						{ label: 'Features', slug: 'features' },
					],
				},
			],
		}),
	],
});
