import path from "path"
import { createMDX } from "fumadocs-mdx/next"

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // The docs pages read component source from these folders at request time.
  outputFileTracingIncludes: {
    "/*": ["./registry/crisp/**/*", "./examples/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
  redirects() {
    return [
      {
        source: "/docs/components/radix/:name",
        destination: "/docs/components/:name",
        permanent: true,
      },
      // The social card used to be a static PNG. Anything that still links to
      // it gets the generated one (app/opengraph-image.tsx).
      {
        source: "/og.png",
        destination: "/opengraph-image",
        permanent: true,
      },
    ]
  },
  rewrites() {
    // Every docs page has a Markdown twin at its URL plus ".md". The docs
    // index lives at /docs, so its twin is /docs.md.
    return [
      {
        source: "/docs.md",
        destination: "/llm",
      },
      {
        source: "/docs/:path*.md",
        destination: "/llm/:path*",
      },
    ]
  },
}

const withMDX = createMDX({})

export default withMDX(nextConfig)
