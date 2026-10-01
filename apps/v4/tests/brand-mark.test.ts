import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// brand/mark.svg is the source of truth. The inline header mark and the
// published icon.svg both copy it, so a hand edit to any one of them (or a
// forgotten `node scripts/build-brand.mjs`) should fail loudly here.

const read = (...parts: string[]) =>
  readFileSync(path.resolve(import.meta.dirname, "../../..", ...parts), "utf8")

const source = read("brand/mark.svg")
const component = read("apps/v4/components/brand-mark.tsx")
const published = read("apps/v4/public/icon.svg")

const attr = (svg: string, tag: string, name: string) =>
  svg.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]+)"`))?.[1]

describe("brand mark", () => {
  it("has the same geometry in the header component as in the source", () => {
    expect(attr(source, "path", "d")).toBeTruthy()
    expect(attr(component, "path", "d")).toBe(attr(source, "path", "d"))
    for (const name of ["cx", "cy", "r"]) {
      expect(attr(component, "circle", name)).toBe(attr(source, "circle", name))
    }
  })

  it("uses the source palette in the header component", () => {
    const colours = source.match(/#[0-9a-f]{6}/gi) ?? []
    expect(colours).toHaveLength(4)
    for (const colour of colours) expect(component).toContain(colour)
  })

  it("publishes icon.svg from the current source", () => {
    expect(attr(published, "path", "d")).toBe(attr(source, "path", "d"))
    for (const colour of source.match(/#[0-9a-f]{6}/gi) ?? []) {
      expect(published).toContain(colour)
    }
  })
})
