"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import { siteConfig } from "@/lib/config"
import { BrandMark } from "@/components/brand-mark"
import { Button } from "@/registry/new-york-v4/ui/button"

export function MainNav({
  items,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  items: { href: string; label: string }[]
}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className={cn("items-center gap-0", className)}
      {...props}
    >
      <Link
        href="/"
        className="mr-2 flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <BrandMark />
        {siteConfig.name}
      </Link>
      {items.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          asChild
          size="sm"
          className="px-2.5"
        >
          <Link
            href={item.href}
            data-active={pathname === item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className="relative items-center"
          >
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
