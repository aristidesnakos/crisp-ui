import { getSiteUrl } from "@/app/site-url"

export { cn } from "cn"

export function absoluteUrl(path: string) {
  return `${getSiteUrl()}${path}`
}
