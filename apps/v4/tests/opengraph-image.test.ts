import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// app/globals.css and brand/mark.svg are the sources of truth. The social card
// keeps hex copies of both because the image renderer cannot read oklch() or
// an SVG <style>, so a token or mark change that skips the card should fail
// here. Fix the card: paste in the hex this test expects.

const root = path.resolve(import.meta.dirname, "../../..")
const read = (...parts: string[]) =>
  readFileSync(path.resolve(root, ...parts), "utf8")

const card = read("apps/v4/app/opengraph-image.tsx")
const css = read("apps/v4/app/globals.css")
const source = read("brand/mark.svg")

// The light theme is the first :root block; .dark comes later.
const light = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? ""

const attr = (svg: string, tag: string, name: string) =>
  svg.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]+)"`))?.[1]

// oklch(L C H) -> OKLab -> linear sRGB -> sRGB hex (Björn Ottosson's matrices).
function oklchToHex(value: string) {
  const [, l, percent, c, h] =
    value.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/) ?? []
  if (l === undefined) throw new Error(`not an oklch() colour: ${value}`)
  const L = Number(l) / (percent ? 100 : 1)
  const hue = (Number(h) * Math.PI) / 180
  const [a, b] = [Number(c) * Math.cos(hue), Number(c) * Math.sin(hue)]
  const lms = [
    [0.3963377774, 0.2158037573],
    [-0.1055613458, -0.0638541728],
    [-0.0894841775, -1.291485548],
  ].map(([ka, kb]) => (L + ka * a + kb * b) ** 3)
  const linear = [
    [4.0767416621, -3.3077115913, 0.2309699292],
    [-1.2684380046, 2.6097574011, -0.3413193965],
    [-0.0041960863, -0.7034186147, 1.707614701],
  ].map((row) => row.reduce((sum, k, i) => sum + k * lms[i], 0))
  const encode = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  const byte = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255)
  const hex = (x: number) => byte(encode(x)).toString(16).padStart(2, "0")
  return `#${linear.map(hex).join("")}`
}

describe("opengraph image", () => {
  it("copies the light theme tokens from globals.css", () => {
    const copies = [...card.matchAll(/"(#[0-9a-f]{6})",\s*\/\/\s*--([\w-]+)/gi)]
    expect(copies.length).toBeGreaterThanOrEqual(4)
    for (const [, hex, token] of copies) {
      const value =
        light.match(new RegExp(`(?<![\\w-])--${token}:\\s*([^;]+);`))?.[1] ?? ""
      expect(value, `--${token} in the :root block`).toMatch(/^oklch\(/)
      expect(hex.toLowerCase(), `--${token}`).toBe(oklchToHex(value))
    }
  })

  it("draws the header mark with the geometry in brand/mark.svg", () => {
    expect(attr(source, "path", "d")).toBeTruthy()
    expect(attr(card, "path", "d")).toBe(attr(source, "path", "d"))
    for (const name of ["cx", "cy", "r"]) {
      expect(attr(card, "circle", name), name).toBe(
        attr(source, "circle", name)
      )
    }
  })

  it("paints the header mark in its light-page colours", () => {
    const style = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ""
    const lightStyle = style.split("@media")[0]
    const mark = card.match(/const mark = \{([^}]*)\}/)?.[1] ?? ""
    for (const part of ["body", "pip"]) {
      const fill = lightStyle.match(
        new RegExp(`\\.${part}\\s*\\{\\s*fill:\\s*(#[0-9a-f]{6})`, "i")
      )?.[1]
      expect(fill, `.${part} in brand/mark.svg`).toBeTruthy()
      const copy = mark.match(new RegExp(`${part}:\\s*"(#[0-9a-f]{6})"`, "i"))
      expect(copy?.[1].toLowerCase(), `mark.${part}`).toBe(fill?.toLowerCase())
    }
  })

  it("loads only fonts that are in assets/fonts", () => {
    const fonts = readdirSync(path.resolve(root, "apps/v4/assets/fonts"))
    const files = [...card.matchAll(/\bfont\("([^"]+)"\)/g)].map((m) => m[1])
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) expect(fonts).toContain(file)
  })
})
