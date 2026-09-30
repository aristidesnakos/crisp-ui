/**
 * Show component source the way a consumer will have it after `shadcn add`:
 * registry paths become the standard `@/components/...` aliases and demo
 * default exports become named exports.
 */
export async function formatCode(code: string, _styleName?: string) {
  code = code.replaceAll("@/registry/crisp/blocks/", "@/components/")
  code = code.replaceAll("@/registry/crisp/ui/", "@/components/ui/")
  code = code.replaceAll("@/registry/crisp/lib/", "@/lib/")
  code = code.replaceAll("@/registry/new-york-v4/ui/", "@/components/ui/")
  code = code.replaceAll("@/registry/new-york-v4/", "@/components/")
  code = code.replaceAll("export default", "export")
  return code
}
