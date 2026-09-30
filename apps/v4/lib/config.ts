export const siteConfig = {
  name: "crisp-ui",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000",
  description:
    "Patterns for dashboards where people depend on a job and need to hear how it is going. Open code, installed with the shadcn CLI.",
  links: {
    github: "https://github.com/aristidesnakos/crisp-ui",
  },
  navItems: [
    {
      href: "/",
      label: "Home",
    },
    {
      href: "/docs",
      label: "Docs",
    },
    {
      href: "/docs/components",
      label: "Patterns",
    },
  ],
}

export const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
}
