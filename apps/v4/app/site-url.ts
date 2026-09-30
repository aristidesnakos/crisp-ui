import { siteConfig } from "@/lib/config"

/**
 * The origin the site is served from. No domain is hard-coded: an explicit
 * NEXT_PUBLIC_APP_URL wins, then Vercel's production host, then the local
 * development URL from siteConfig.
 */
export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit) {
    return explicit.replace(/\/+$/, "")
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`.replace(/\/+$/, "")
  }

  return siteConfig.url.replace(/\/+$/, "")
}
