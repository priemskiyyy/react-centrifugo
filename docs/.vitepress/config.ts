import { defineConfig } from "vitepress";

// Project pages are served from /<repository>/. Set this to "/" for a user page
// or a custom domain.
const base = "/react-centrifugo/";
const site = "https://priemskiyyy.github.io/react-centrifugo/";
const description =
  "Centrifugo hooks for React: the native SDK surface on top of the simulcast runtime, with shared subscriptions, typed events, and generated hooks.";

export default defineConfig({
  base,
  lang: "en-US",
  title: "React Centrifugo",
  description,
  head: [
    [
      "link",
      { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` },
    ],
    [
      "meta",
      {
        name: "keywords",
        content:
          "react, react hooks, centrifugo, centrifuge, websocket, realtime, pubsub, typescript, simulcast",
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "React Centrifugo" }],
    ["meta", { property: "og:title", content: "React Centrifugo" }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:url", content: site }],
    ["meta", { name: "twitter:card", content: "summary" }],
  ],
  sitemap: { hostname: site },
  // README.md is the GitHub-facing index; index.md is the site home.
  srcExclude: ["README.md"],
  cleanUrls: true,
  lastUpdated: true,
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
      { text: "Hooks", link: "/hooks" },
      { text: "Typed events", link: "/typed-events" },
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
          { text: "Devtools", link: "/devtools" },
          { text: "Server rendering", link: "/server-rendering" },
          { text: "Errors and recovery", link: "/error-handling" },
        ],
      },
      {
        text: "Reference",
        items: [{ text: "Hooks", link: "/hooks" }],
      },
    ],
    search: { provider: "local" },
    outline: { level: [2, 3] },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © React Centrifugo contributors",
    },
  },
});
