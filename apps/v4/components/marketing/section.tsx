import * as React from "react"
import { cn } from "cn"

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "text-xs font-medium tracking-[0.16em] text-brand uppercase",
        className
      )}
    >
      {children}
    </p>
  )
}

/** A marketing section: eyebrow, serif title, lede, then content. */
export function Section({
  id,
  eyebrow,
  title,
  lede,
  tone = "plain",
  align = "start",
  space = "default",
  className,
  children,
}: {
  id: string
  eyebrow?: React.ReactNode
  title?: React.ReactNode
  lede?: React.ReactNode
  tone?: "plain" | "paper"
  align?: "start" | "center"
  /** "roomy" gives the calmer, taller rhythm the landing uses. */
  space?: "default" | "roomy"
  className?: string
  children?: React.ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={title ? `${id}-title` : undefined}
      className={cn(
        "scroll-mt-16",
        space === "roomy" ? "py-28 md:py-40" : "py-20 md:py-28",
        tone === "paper" && "bg-paper",
        className
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        {eyebrow || title || lede ? (
          <header
            className={cn(
              "flex max-w-2xl flex-col gap-4",
              space === "roomy" ? "mb-14 md:mb-20" : "mb-12",
              align === "center" && "mx-auto items-center text-center"
            )}
          >
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            {title ? (
              <h2
                id={`${id}-title`}
                className="font-display text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl"
              >
                {title}
              </h2>
            ) : null}
            {lede ? (
              <p className="text-lg text-pretty text-muted-foreground">
                {lede}
              </p>
            ) : null}
          </header>
        ) : null}
        {children}
      </div>
    </section>
  )
}
