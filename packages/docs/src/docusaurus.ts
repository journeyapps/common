import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

export interface GenerateConfigOptions {
  project_name: string;
}

export const generateConfig = (options: GenerateConfigOptions) => {
  const { project_name } = options;
  return {
    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
      v4: true // Improve compatibility with the upcoming Docusaurus v4
    },
    // Set the production url of your site here
    url: 'https://journeyapps.github.io/',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: `/${project_name}/`,
    trailingSlash: false,
    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'journeyapps',
    projectName: project_name,

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
      defaultLocale: 'en',
      locales: ['en']
    },

    presets: [
      [
        '@docusaurus/preset-classic',
        {
          docs: {
            routeBasePath: '/',
            sidebarPath: './sidebars.ts',
            path: 'docs'
          },
          blog: {
            showReadingTime: true,
            feedOptions: {
              type: ['rss', 'atom'],
              xslt: true
            },
            // Useful options to enforce blogging best practices
            onInlineTags: 'warn',
            onInlineAuthors: 'warn',
            onUntruncatedBlogPosts: 'warn'
          },
          theme: {
            customCss: './src/css/custom.css'
          }
        } satisfies Preset.Options
      ]
    ],
    themeConfig: {
      // Replace with your project's social card
      image: 'img/labs.png',
      navbar: {
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'mainSidebar',
            position: 'left',
            label: 'Getting started'
          },
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'TSDoc'
          },
          {
            href: `https://github.com/journeyapps/${project_name}`,
            label: 'GitHub',
            position: 'right'
          }
        ]
      },
      footer: {
        copyright: `Copyright © ${new Date().getFullYear()} Journey Mobile, Inc.`
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula
      },
      future: {
        experimental_faster: true
      }
    } satisfies Preset.ThemeConfig
  } as Omit<Config, 'title'>;
};
