import { NextResponse, type NextRequest } from "next/server"
import { getNegotiator } from "fumadocs-core/negotiation"

// Media types an agent sends when it wants the page as text. `text/html` is
// listed first so that a tie, such as `*/*`, resolves to HTML.
const PROVIDED = ["text/html", "text/markdown", "text/x-markdown", "text/plain"]

function prefersMarkdown(request: NextRequest) {
  const preferred = getNegotiator(request).mediaType(PROVIDED)
  return preferred !== undefined && preferred !== "text/html"
}

/**
 * A docs URL requested with `Accept: text/markdown` is answered with the
 * page's Markdown twin (the /llm route, which next.config.mjs also reaches
 * through `/docs/<page>.md`). A browser still gets HTML.
 *
 * The proxy only picks which prerendered page to serve, so docs pages stay
 * static. `Vary: Accept` tells caches the two answers are different. It
 * reaches the client on the markdown response; Next replaces the Vary header
 * of a prerendered HTML response with its own, so a CDN placed in front of
 * this app must be told to key docs URLs on Accept itself.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // The .md twins are markdown whatever the Accept header says.
  if (pathname.endsWith(".md")) {
    return NextResponse.next()
  }

  const response = prefersMarkdown(request)
    ? NextResponse.rewrite(
        new URL(`/llm${pathname.replace(/^\/docs/, "")}`, request.url)
      )
    : NextResponse.next()

  response.headers.append("Vary", "Accept")
  return response
}

export const config = {
  matcher: ["/docs", "/docs/:path*"],
}
