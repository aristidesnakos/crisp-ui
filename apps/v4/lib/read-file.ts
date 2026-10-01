import { promises as fs } from "fs"
import path from "path"

// Only files under registry/crisp and examples are ever read here; they are
// traced explicitly via `outputFileTracingIncludes` in next.config.mjs, so the
// dynamic path is opted out of Turbopack's whole-project tracing.
export async function readFileFromRoot(relativePath: string) {
  const absolutePath = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    relativePath
  )
  return fs.readFile(absolutePath, "utf-8")
}
