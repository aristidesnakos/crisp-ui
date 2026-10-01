// @ts-nocheck
// Keep in step with examples/radix/*.tsx. The generator script no longer exists.
import "server-only"

import * as React from "react"

const shards: Record<
  string,
  {
    load: () => Promise<{ Components: Record<string, any> }>
    names: Set<string>
  }
> = {
  radix: {
    load: () => import("./radix"),
    names: new Set([
      "status-notify-demo",
      "status-strip-demo",
      "recipient-roster-demo",
      "confirm-send-demo",
      "save-bar-demo",
      "notify-envelope-demo",
      "approval-step-demo",
    ]),
  },
}

const cache = new Map<string, any>()

// Sync existence check via the names set; the shard module (and with it the
// component's dynamic-import subtree) only loads when the component renders.
export function getComponent(styleName: string, name: string) {
  const shard = shards[styleName]
  if (!shard?.names.has(name)) {
    return undefined
  }

  const cacheKey = `${styleName}:${name}`
  let component = cache.get(cacheKey)
  if (!component) {
    component = React.lazy(async () => {
      const { Components } = await shard.load()
      return { default: Components[name] }
    })
    cache.set(cacheKey, component)
  }

  return component
}
