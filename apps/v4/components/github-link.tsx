import * as React from "react"
import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { Icons } from "@/components/icons"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Skeleton } from "@/registry/new-york-v4/ui/skeleton"

export function GitHubLink() {
  return (
    <Button asChild size="sm" variant="ghost" className="h-8 shadow-none">
      <Link href={siteConfig.links.github} target="_blank" rel="noreferrer">
        <Icons.gitHub />
        <span className="sr-only">GitHub</span>
        <React.Suspense fallback={<Skeleton className="h-4 w-[42px]" />}>
          <StarsCount />
        </React.Suspense>
      </Link>
    </Button>
  )
}

// "https://github.com/owner/repo" -> "owner/repo"
const repo = new URL(siteConfig.links.github).pathname
  .replace(/^\/+|\/+$/g, "")
  .replace(/\.git$/, "")

export async function StarsCount() {
  let stars: number | undefined

  try {
    const data = await fetch(`https://api.github.com/repos/${repo}`, {
      next: { revalidate: 86400 },
    })
    const json = await data.json()
    stars =
      typeof json.stargazers_count === "number"
        ? json.stargazers_count
        : undefined
  } catch {}

  if (stars === undefined) {
    return null
  }

  const formattedCount =
    stars >= 1000 ? `${Math.round(stars / 1000)}k` : stars.toLocaleString()

  return (
    <span className="w-fit text-xs text-muted-foreground tabular-nums">
      {formattedCount}
      <span className="sr-only"> stars</span>
    </span>
  )
}
