import { promises as fs } from "fs"
import path from "path"
import { getComponent as getExamplesComponent } from "@/examples/__components__"
import { ExamplesIndex } from "@/examples/__index__"
import { LRUCache } from "lru-cache"
import { registryItemSchema } from "shadcn/schema"
import { type z } from "zod"

import { readFileFromRoot } from "@/lib/read-file"

type RegistryItem = z.infer<typeof registryItemSchema>

// LRU cache for built registry items read from public/r.
const registryCache = new LRUCache<string, { item: RegistryItem | null }>({
  max: 100,
  ttl: 1000 * 60 * 5,
})

// Style names look like "radix-nova": the part before the first dash is the
// base the demo lives under. A bare base name ("radix") is also accepted.
function getDemoIndexKey(styleName: string) {
  if (ExamplesIndex[styleName]) {
    return styleName
  }

  const base = styleName.split("-")[0]
  if (base && ExamplesIndex[base]) {
    return base
  }

  return styleName
}

export function getDemoComponent(name: string, styleName: string) {
  return getExamplesComponent(getDemoIndexKey(styleName), name)
}

export async function getDemoItem(name: string, styleName: string) {
  const demo = ExamplesIndex[getDemoIndexKey(styleName)]?.[name]
  if (!demo) {
    return null
  }

  const content = await readFileFromRoot(demo.filePath)

  return {
    name: demo.name,
    type: "registry:internal" as const,
    files: [
      {
        path: demo.filePath,
        content,
        type: "registry:internal" as const,
      },
    ],
  }
}

export function getRegistryComponent(name: string, styleName: string) {
  return getDemoComponent(name, styleName)
}

// Registry items are the built JSON files under public/r/<name>.json. There is
// no generated registry index any more, so anything not built there is null.
export async function getRegistryItem(name: string, _styleName?: string) {
  if (!/^[\w-]+$/.test(name)) {
    return null
  }

  if (registryCache.has(name)) {
    return registryCache.get(name)?.item ?? null
  }

  let item: RegistryItem | null = null

  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "public", "r", `${name}.json`),
      "utf-8"
    )
    const parsed = registryItemSchema.safeParse(JSON.parse(raw))
    item = parsed.success ? parsed.data : null
  } catch {
    item = null
  }

  registryCache.set(name, { item })
  return item
}

export async function getRegistryItems(
  _styleName?: string,
  filter?: (item: RegistryItem) => boolean
) {
  let names: string[] = []

  try {
    const entries = await fs.readdir(path.join(process.cwd(), "public", "r"))
    names = entries
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => entry.replace(/\.json$/, ""))
  } catch {
    return []
  }

  const items = await Promise.all(names.map((name) => getRegistryItem(name)))

  return items.filter((item): item is RegistryItem => {
    return item !== null && (!filter || filter(item))
  })
}
