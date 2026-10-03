import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { proxy } from "../proxy"

function run(pathname: string, accept?: string) {
  const response = proxy(
    new NextRequest(`https://realgood.site${pathname}`, {
      headers: accept ? { accept } : {},
    })
  )
  return {
    rewrite: response.headers.get("x-middleware-rewrite"),
    vary: response.headers.get("vary"),
  }
}

const BROWSER =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"

describe("proxy", () => {
  it("rewrites a docs URL to its markdown twin when markdown is preferred", () => {
    const result = run("/docs/components/status-notify", "text/markdown")
    expect(result.rewrite).toBe(
      "https://realgood.site/llm/components/status-notify"
    )
    expect(result.vary).toBe("Accept")
  })

  it("rewrites the docs index", () => {
    expect(run("/docs", "text/markdown").rewrite).toBe(
      "https://realgood.site/llm"
    )
  })

  it("prefers markdown when it ranks above html", () => {
    expect(
      run("/docs/installation", "text/markdown, text/html;q=0.5").rewrite
    ).toContain("/llm/installation")
  })

  it("serves html to browsers, curl and an unspecified Accept, still varying on Accept", () => {
    for (const accept of [BROWSER, "*/*", undefined]) {
      const result = run("/docs/components/status-notify", accept)
      expect(result.rewrite).toBeNull()
      expect(result.vary).toBe("Accept")
    }
  })

  it("serves html when html outranks markdown", () => {
    expect(
      run("/docs/installation", "text/html, text/markdown;q=0.5").rewrite
    ).toBeNull()
  })

  it("leaves .md twins alone", () => {
    const result = run("/docs/installation.md", "text/markdown")
    expect(result.rewrite).toBeNull()
    expect(result.vary).toBeNull()
  })
})
