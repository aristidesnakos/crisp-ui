# Examples

Demo components for the component docs. Each one is rendered live by
`<ComponentPreview name="..." />` and its source is shown beside it.

The `radix` folder name is inherited from the upstream fork: the docs resolve
the default `styleName="radix-nova"` to `examples/radix`.

## Adding a demo

1. Create `examples/radix/<name>-demo.tsx`. It may use a default or a named
   export, and should import from `@/registry/crisp/...`. Use in-memory fake
   data only, no network.
2. Register it by hand in all three places, because the generator script no
   longer exists:
   - `examples/__index__.tsx`
   - `examples/__components__/radix.tsx`
   - the `names` set in `examples/__components__/index.tsx`
3. Use it in an MDX page:

```mdx
<ComponentPreview styleName="radix-nova" name="<name>-demo" />
```
