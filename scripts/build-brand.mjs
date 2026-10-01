#!/usr/bin/env node
// Regenerates every derived brand asset from the one source file, brand/mark.svg.
//
//   node scripts/build-brand.mjs
//
// Needs `rsvg-convert` (brew install librsvg) and `magick` (brew install imagemagick).
// The outputs are committed, so CI and Vercel never run this: it exists so the
// favicons, touch icons and OG card are reproducible rather than hand-edited.
//
// The palette is not duplicated here. It is read from the <style> block in
// mark.svg: the light-page colours are the ink/violet pair, the dark-page
// colours are the cream/soft-violet pair, and the app tiles and OG card are
// built from those four values.

import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const publicDir = path.join(root, "apps/v4/public")
const source = readFileSync(path.join(root, "brand/mark.svg"), "utf8")

for (const tool of ["rsvg-convert", "magick"]) {
  try {
    execFileSync("which", [tool], { stdio: "ignore" })
  } catch {
    console.error(`build-brand: \`${tool}\` not found on PATH`)
    process.exit(1)
  }
}

// --- read the source ---------------------------------------------------------

const css = source.match(/<style>([\s\S]*?)<\/style>/)?.[1]
const shapes = source.match(/<\/style>([\s\S]*)<\/svg>/)?.[1].trim()
if (!css || !shapes) throw new Error("brand/mark.svg: expected <style> then shapes")

const [lightCss, darkCss] = css.split("@media")
const fill = (block, cls) =>
  block.match(new RegExp(`\\.${cls}\\s*\\{\\s*fill:\\s*(#[0-9a-fA-F]{6})`))?.[1]
const ink = fill(lightCss, "body")
const violet = fill(lightCss, "pip")
const cream = fill(darkCss, "body")
const violetSoft = fill(darkCss, "pip")
if (!ink || !violet || !cream || !violetSoft) {
  throw new Error("brand/mark.svg: need .body and .pip fills in both colour schemes")
}

// The shapes sit in a 64 unit box. Their real extent is x 6..60, y 4..58 (the
// dot overhangs the bitten corner), so that is what gets centred in a tile.
const BOX = { cx: 33, cy: 31 }

const flat = (body, pip) => `.body{fill:${body}}.pip{fill:${pip}}`

// The mark on a 64 unit tile at the given scale: centred by default, or with
// the square body's top-left corner at (x0, y0) when a size needs its edges on
// whole pixels (the body spans x 6..58, y 6..58).
function tileSvg({ bg, body, pip, scale, radius = 0, x0, y0 }) {
  const tx = x0 === undefined ? 32 - BOX.cx * scale : x0 - 6 * scale
  const ty = y0 === undefined ? 32 - BOX.cy * scale : y0 - 6 * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>${flat(body, pip)}</style><rect width="64" height="64" rx="${radius}" fill="${bg}"/><g transform="translate(${tx} ${ty}) scale(${scale})">${shapes}</g></svg>`
}

// --- rasterising -------------------------------------------------------------

const png = (svg, size, out, { opaque } = {}) => {
  execFileSync("rsvg-convert", ["-w", size, "-h", size, "-o", out], { input: svg })
  if (opaque) flatten(out, opaque)
}
const flatten = (file, bg) =>
  execFileSync("magick", [file, "-background", bg, "-alpha", "remove", "-alpha", "off", "-strip", file])
const out = (name) => path.join(publicDir, name)

// Dark tile: cream mark on ink. It reads on any tab or home screen, light or dark.
const tile = (scale, radius, at) =>
  tileSvg({ bg: ink, body: cream, pip: violetSoft, scale, radius, ...at })

// A tile whose body is `bodyPx` wide, `marginPx` in from the top-left, at a
// tile of `px` pixels: the edges land on pixel boundaries, so they stay crisp.
const pixelTile = (px, bodyPx, marginPx, radius) =>
  tile((bodyPx * 64) / px / 52, radius, {
    x0: (marginPx * 64) / px,
    y0: (marginPx * 64) / px,
  })

// icon.svg is the source minus its commentary: transparent, and it follows the
// reader's colour scheme itself.
writeFileSync(
  out("icon.svg"),
  source.replace(/<!--[\s\S]*?-->\s*/g, "").replace(/\n\s*\n/g, "\n")
)

// Favicons, with the body snapped to whole pixels: at 16px a half-pixel edge
// is a visible grey fringe.
const favicon = {
  16: pixelTile(16, 12, 2, 10),
  32: pixelTile(32, 22, 5, 10),
  48: pixelTile(48, 34, 7, 11),
}
png(favicon[16], 16, out("favicon-16x16.png"))
png(favicon[32], 32, out("favicon-32x32.png"))
const scratch = mkdtempSync(path.join(os.tmpdir(), "crisp-brand-"))
const ico48 = path.join(scratch, "48.png")
png(favicon[48], 48, ico48)
execFileSync("magick", [out("favicon-16x16.png"), out("favicon-32x32.png"), ico48, out("favicon.ico")])
rmSync(scratch, { recursive: true, force: true })

// Touch icon: opaque and square, because iOS applies its own corner mask.
png(tile(0.74, 0), 180, out("apple-touch-icon.png"), { opaque: ink })

// Manifest icons: rounded for "any", full-bleed with a safe margin for "maskable".
png(tile(0.84, 12), 192, out("android-chrome-192x192.png"))
png(tile(0.84, 12), 512, out("android-chrome-512x512.png"))
png(tile(0.6, 0), 512, out("android-chrome-maskable-512x512.png"), { opaque: ink })

// --- social card -------------------------------------------------------------

const SCALE = 5.2
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <style>
    ${flat(ink, violet)}
    .name{font:600 136px 'Avenir Next',Avenir,Helvetica,sans-serif;letter-spacing:-4px;fill:${ink}}
    .tag{font:400 40px 'Avenir Next',Avenir,Helvetica,sans-serif;fill:${ink};fill-opacity:.78}
    .foot{font:500 26px 'Avenir Next',Avenir,Helvetica,sans-serif;letter-spacing:.5px;fill:${ink};fill-opacity:.55}
  </style>
  <rect width="1200" height="630" fill="${cream}"/>
  <g transform="translate(${96 - 6 * SCALE} ${(630 - 54 * SCALE) / 2 - 4 * SCALE}) scale(${SCALE})">${shapes}</g>
  <text class="name" x="446" y="316">crisp-ui</text>
  <text class="tag" x="450" y="398">Patterns for dashboards</text>
  <text class="tag" x="450" y="448">people depend on.</text>
  <text class="foot" x="450" y="536">Open code, installed with the shadcn CLI</text>
</svg>`
execFileSync("rsvg-convert", ["-w", 1200, "-h", 630, "-o", out("og.png")], { input: ogSvg })
flatten(out("og.png"), cream)

console.log("build-brand: wrote icon.svg, favicons, touch icon, manifest icons, og.png")
