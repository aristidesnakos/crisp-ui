import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { DevFeedback } from "@/components/dev/dev-feedback"

const COLUMNS = [
  {
    title: "Tools",
    links: [
      ["Training tracker", "/tools/training-tracker"],
      ["Calibration recall desk", "/docs/components/calibration-desk"],
      ["All tools", "/tools"],
    ],
  },
  {
    title: "Learn",
    links: [
      ["How it works", "/#how-it-works"],
      ["The five moments", "/docs/story"],
      ["Pricing", "/pricing"],
    ],
  },
  {
    title: "Build",
    links: [
      ["Building blocks", "/docs/components"],
      ["For AI assistants", "/docs/ai"],
      ["llms.txt", "/llms.txt"],
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="group-has-[.docs-nav]/body:pb-20 group-has-[[data-slot=docs]]/body:hidden group-has-[.docs-nav]/body:sm:pb-0 dark:bg-transparent 3xl:fixed:bg-transparent">
      <DevFeedback name="Footer">
        <div className="border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:px-6">
            <div className="flex flex-col gap-3">
              <p className="font-display text-3xl">{siteConfig.name}</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Finished tools for teams that need a paper trail. You know the
                job; now you can build the tool.
              </p>
            </div>
            {COLUMNS.map((column) => (
              <nav
                key={column.title}
                aria-label={column.title}
                className="flex flex-col gap-3"
              >
                <h2 className="text-sm font-medium">{column.title}</h2>
                <ul className="flex list-none flex-col gap-2 p-0 text-sm text-muted-foreground">
                  {column.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="hover:text-foreground">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="mx-auto w-full max-w-6xl border-t px-4 py-6 text-xs text-muted-foreground md:px-6">
            The building blocks are open source on{" "}
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              GitHub
            </a>
            , built on{" "}
            <a
              href="https://github.com/shadcn-ui/ui"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              shadcn/ui
            </a>{" "}
            under the MIT licence.
          </div>
        </div>
      </DevFeedback>
    </footer>
  )
}
