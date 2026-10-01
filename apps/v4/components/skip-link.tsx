"use client"

export function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={(event) => {
        const main = document.querySelector("main")
        if (!main) {
          return
        }
        event.preventDefault()
        if (!main.id) {
          main.id = "main-content"
        }
        main.tabIndex = -1
        main.focus()
        main.scrollIntoView()
      }}
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-[100] focus-visible:rounded-md focus-visible:bg-background focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      Skip to content
    </a>
  )
}
