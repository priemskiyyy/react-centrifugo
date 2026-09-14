import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// Project pages are served from /<repository>/. Set this to "/" for a user page
// or a custom domain.
const base = "/react-centrifugo/";

export default withMermaid(
  defineConfig({
    base,
    lang: "en-US",
    title: "React Centrifugo",
    description:
      "React hooks for Centrifugo with shared subscriptions, optional parsing, and typed generated event hooks.",
    head: [
      [
        "link",
        { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` },
      ],
    ],
    // README.md is the GitHub-facing index; index.md is the site home.
    srcExclude: ["README.md"],
    cleanUrls: true,
    lastUpdated: true,
    vite: {
      // Mermaid pulls lodash-es; without pre-bundling, Vite dev serves its ~600
      // modules individually and the app never finishes booting.
      optimizeDeps: { include: ["mermaid", "lodash-es"] },
    },
    themeConfig: {
      logo: { src: "/favicon.svg", alt: "" },
      socialLinks: [
        {
          icon: "github",
          link: "https://github.com/priemskiyyy/react-centrifugo",
        },
      ],
      editLink: {
        pattern:
          "https://github.com/priemskiyyy/react-centrifugo/edit/main/docs/:path",
      },
      nav: [
        { text: "Guide", link: "/getting-started" },
        { text: "Code generation", link: "/codegen" },
        { text: "Hooks", link: "/hooks" },
        { text: "Devtools", link: "/devtools" },
      ],
      sidebar: [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/getting-started" },
            { text: "Configuration", link: "/configuration" },
            { text: "Typed events", link: "/typed-events" },
            { text: "Code generation", link: "/codegen" },
            { text: "Devtools (experimental)", link: "/devtools" },
            { text: "Server rendering", link: "/server-rendering" },
            { text: "Errors and recovery", link: "/error-handling" },
          ],
        },
        {
          text: "Reference",
          items: [{ text: "Hooks", link: "/hooks" }],
        },
        {
          text: "Internals",
          collapsed: true,
          items: [
            { text: "Runtime architecture", link: "/internals/architecture" },
            {
              text: "Subscription review",
              link: "/internals/subscription-review",
            },
          ],
        },
      ],
      search: { provider: "local" },
      outline: { level: [2, 3] },
      footer: {
        message: "Released under the MIT License.",
        copyright: "Copyright © React Centrifugo contributors",
      },
    },
  }),
);
