export const siteConfig = {
  name: "Real Good Site",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000",
  description:
    "Finished tools for schools, building sites and training teams. Describe your team in plain words and your AI assistant makes the tool yours, with reminders, sign-offs and a record built in.",
  links: {
    github: "https://github.com/aristidesnakos/crisp-ui",
  },
  navItems: [
    {
      href: "/tools",
      label: "Tools",
    },
    {
      href: "/#how-it-works",
      label: "How it works",
    },
    {
      href: "/docs/components",
      label: "Building blocks",
    },
    {
      href: "/docs/ai",
      label: "For AI assistants",
    },
    {
      href: "/pricing",
      label: "Pricing",
    },
  ],
}

export const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#0a0a0a",
}
