import Image from "next/image"
import Link from "next/link"
import { cn } from "cn"
import { ArrowRight, ArrowUpRight } from "lucide-react"

import type { ShowcaseItem } from "@/lib/tools"

/**
 * Every site at once: the built sites two by two, then the starting point
 * (the training tracker) as one wide tile.
 */
export function ShowcaseGrid({ items }: { items: ShowcaseItem[] }) {
  return (
    <ul className="grid list-none gap-x-8 gap-y-14 p-0 md:grid-cols-2">
      {items.map((item, i) => {
        const start = item.kind === "start"
        return (
          <li key={item.href} className={cn(start && "md:col-span-2")}>
            <figure className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-2xl border bg-background">
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={1280}
                  height={800}
                  loading={i === 0 ? "eager" : "lazy"}
                  sizes={
                    start
                      ? "(min-width: 1200px) 1100px, calc(100vw - 32px)"
                      : "(min-width: 1200px) 540px, (min-width: 768px) 45vw, calc(100vw - 32px)"
                  }
                  className={cn(
                    "h-auto w-full bg-muted object-cover object-top",
                    start ? "aspect-[16/10] md:aspect-[21/9]" : "aspect-[16/10]"
                  )}
                />
              </div>
              <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl leading-tight">
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] tracking-[0.14em] uppercase",
                      start ? "text-brand" : "text-muted-foreground"
                    )}
                  >
                    {item.sector}
                  </span>
                </div>
                {start ? (
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                  >
                    Start from the training tracker
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                  >
                    Visit<span className="sr-only"> {item.name}</span> site
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </figcaption>
            </figure>
          </li>
        )
      })}
    </ul>
  )
}
