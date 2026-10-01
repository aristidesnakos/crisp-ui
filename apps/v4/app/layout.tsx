import type { Metadata } from "next"
import { cn } from "cn"
import { NuqsAdapter } from "nuqs/adapters/next/app"

import { META_THEME_COLORS, siteConfig } from "@/lib/config"
import { DOCS_SIDEBAR_SCROLL_RESTORE_SCRIPT } from "@/lib/docs-sidebar-scroll"
import { fontVariables } from "@/lib/fonts"
import { ActiveThemeProvider } from "@/components/active-theme"
import { SkipLink } from "@/components/skip-link"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/registry/new-york-v4/ui/sonner"
import { TooltipProvider } from "@/registry/new-york-v4/ui/tooltip"
import { getSiteUrl } from "@/app/site-url"

import "@/app/globals.css"
import "@/app/typeset.css"

const siteUrl = getSiteUrl()
const ogImage = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: siteConfig.name,
}

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  metadataBase: new URL(siteUrl),
  description: siteConfig.description,
  keywords: [
    "React",
    "Tailwind CSS",
    "dashboard",
    "status",
    "notifications",
    "component registry",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [ogImage],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        fontVariables,
        "[--header-height:calc(var(--spacing)*14)] lg:[--header-height:calc(var(--spacing)*16)]"
      )}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: DOCS_SIDEBAR_SCROLL_RESTORE_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `,
          }}
        />
        <meta name="theme-color" content={META_THEME_COLORS.light} />
      </head>
      <body
        className={cn(
          "group/body overscroll-none antialiased [--footer-height:calc(var(--spacing)*14)] xl:[--footer-height:calc(var(--spacing)*24)]"
        )}
      >
        <SkipLink />
        <ThemeProvider>
          <ActiveThemeProvider>
            <NuqsAdapter>
              <TooltipProvider delayDuration={0}>
                {children}
                <Toaster position="top-center" />
              </TooltipProvider>
            </NuqsAdapter>
            <TailwindIndicator />
          </ActiveThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
