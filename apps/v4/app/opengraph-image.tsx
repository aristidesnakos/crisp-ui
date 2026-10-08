import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

import { heroCopy, siteConfig } from "@/lib/config"
import { getSiteUrl } from "@/app/site-url"

// The social card every page shares in link previews (X, LinkedIn, Slack,
// Product Hunt). It is built at deploy time from the landing hero copy and the
// site's own fonts and colours, so it cannot fall behind the site the way a
// hand-made PNG did.

export const alt = `${siteConfig.name}: ${heroCopy.lead} ${heroCopy.emphasis}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// app/globals.css tokens in sRGB hex: the image renderer cannot parse oklch().
// tests/opengraph-image.test.ts fails if these drift from the stylesheet.
const color = {
  paper: "#faf6ef", // --paper
  brand: "#a8471b", // --brand
  foreground: "#000000", // --foreground
  muted: "#696969", // --muted-foreground
}

// The header mark, in its light-page colours (brand/mark.svg).
const mark = { body: "#24173f", pip: "#7c3aed" }

const font = (file: string) =>
  readFile(join(process.cwd(), "assets/fonts", file))

const [serif, serifItalic, sansMedium, sansSemiBold] = await Promise.all([
  font("InstrumentSerif-Regular.ttf"),
  font("InstrumentSerif-Italic.ttf"),
  font("Geist-Medium.ttf"),
  font("Geist-SemiBold.ttf"),
])

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "64px 96px 60px",
          background: color.paper,
          color: color.foreground,
          fontFamily: "Geist",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: -0.5,
          }}
        >
          <svg width="36" height="36" viewBox="6 4 54 54">
            <path fill={mark.body} d="M6 6H39.35A14 14 0 0 0 58 24.65V58H6Z" />
            <circle fill={mark.pip} cx="52" cy="12" r="8" />
          </svg>
          {siteConfig.name}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 30,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 3.5,
              color: color.brand,
            }}
          >
            {heroCopy.eyebrow.toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontFamily: "Instrument Serif",
              fontSize: 100,
              lineHeight: 1,
              letterSpacing: -2,
              textAlign: "center",
            }}
          >
            <div>{heroCopy.lead}</div>
            <div style={{ fontStyle: "italic", color: color.brand }}>
              {heroCopy.emphasis}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 24, fontWeight: 500, color: color.muted }}>
          {new URL(getSiteUrl()).host}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serif, weight: 400, style: "normal" },
        {
          name: "Instrument Serif",
          data: serifItalic,
          weight: 400,
          style: "italic",
        },
        { name: "Geist", data: sansMedium, weight: 500, style: "normal" },
        { name: "Geist", data: sansSemiBold, weight: 600, style: "normal" },
      ],
    }
  )
}
