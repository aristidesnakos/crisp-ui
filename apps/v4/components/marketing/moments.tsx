import Link from "next/link"
import { cn } from "cn"
import { ArrowRight } from "lucide-react"

import { STATUS_LABEL, type MomentItem, type Tool } from "@/lib/tools"

/** The five moments every tool runs, as the person using it sees them. */
export function Moments({ items }: { items: MomentItem[] }) {
  return (
    <ol className="grid list-none gap-px overflow-hidden rounded-2xl border bg-border p-0 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item, i) => (
        <li
          key={item.stage}
          className="flex flex-col gap-3 bg-background p-6 last:sm:col-span-2 last:lg:col-span-1"
        >
          <span className="text-[11px] font-medium tracking-[0.14em] text-brand uppercase">
            {String(i + 1).padStart(2, "0")} · {item.stage}
          </span>
          <p className="font-display text-2xl leading-tight text-balance">
            “{item.quote}”
          </p>
          <p className="text-sm text-pretty text-muted-foreground">
            {item.text}
          </p>
        </li>
      ))}
    </ol>
  )
}

export function ToolCard({
  tool,
  featured = false,
}: {
  tool: Tool
  featured?: boolean
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl border bg-card p-6 text-card-foreground transition-colors has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50",
        tool.href && "hover:border-foreground/30",
        tool.status === "next" && "bg-transparent",
        featured && "md:p-8"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <ul className="flex list-none flex-wrap gap-1.5 p-0">
          {tool.industries.map((industry) => (
            <li
              key={industry}
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {industry}
            </li>
          ))}
        </ul>
        <span
          className={cn(
            "shrink-0 text-xs font-medium",
            tool.status === "available" ? "text-brand" : "text-muted-foreground"
          )}
        >
          {STATUS_LABEL[tool.status]}
        </span>
      </div>
      <h3
        className={cn(
          "font-display leading-tight",
          featured ? "text-4xl md:text-5xl" : "text-3xl"
        )}
      >
        {tool.href ? (
          <Link
            href={tool.href}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {tool.name}
          </Link>
        ) : (
          tool.name
        )}
      </h3>
      <p
        className={cn(
          "text-pretty text-muted-foreground",
          featured && "max-w-md text-lg"
        )}
      >
        {tool.job}
      </p>
      {tool.href ? (
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium">
          See it working
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      ) : null}
    </article>
  )
}
