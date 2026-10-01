// @ts-nocheck
// Keep in step with examples/radix/*.tsx. The generator script no longer exists.
import "server-only"

import * as React from "react"

export const Components: Record<string, any> = {
  "status-notify-demo": React.lazy(async () => {
    const mod = await import("@/examples/radix/status-notify-demo")
    const exportName =
      Object.keys(mod).find(
        (key) => typeof mod[key] === "function" || typeof mod[key] === "object"
      ) || "status-notify-demo"
    return { default: mod.default || mod[exportName] }
  }),
  "status-strip-demo": React.lazy(async () => {
    const mod = await import("@/examples/radix/status-strip-demo")
    const exportName =
      Object.keys(mod).find(
        (key) => typeof mod[key] === "function" || typeof mod[key] === "object"
      ) || "status-strip-demo"
    return { default: mod.default || mod[exportName] }
  }),
  "recipient-roster-demo": React.lazy(async () => {
    const mod = await import("@/examples/radix/recipient-roster-demo")
    const exportName =
      Object.keys(mod).find(
        (key) => typeof mod[key] === "function" || typeof mod[key] === "object"
      ) || "recipient-roster-demo"
    return { default: mod.default || mod[exportName] }
  }),
  "confirm-send-demo": React.lazy(async () => {
    const mod = await import("@/examples/radix/confirm-send-demo")
    const exportName =
      Object.keys(mod).find(
        (key) => typeof mod[key] === "function" || typeof mod[key] === "object"
      ) || "confirm-send-demo"
    return { default: mod.default || mod[exportName] }
  }),
  "save-bar-demo": React.lazy(async () => {
    const mod = await import("@/examples/radix/save-bar-demo")
    const exportName =
      Object.keys(mod).find(
        (key) => typeof mod[key] === "function" || typeof mod[key] === "object"
      ) || "save-bar-demo"
    return { default: mod.default || mod[exportName] }
  }),
  "notify-envelope-demo": React.lazy(async () => {
    const mod = await import("@/examples/radix/notify-envelope-demo")
    const exportName =
      Object.keys(mod).find(
        (key) => typeof mod[key] === "function" || typeof mod[key] === "object"
      ) || "notify-envelope-demo"
    return { default: mod.default || mod[exportName] }
  }),
}
