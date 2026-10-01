import * as React from "react"

import { getRegistryComponent } from "@/lib/registry"
import { ComponentPreviewTabs } from "@/components/component-preview-tabs"
import { ComponentSource } from "@/components/component-source"
import { DevFeedback } from "@/components/dev/dev-feedback"

export function ComponentPreview({
  name,
  className,
  previewClassName,
  align = "center",
  hideCode = false,
  chromeLessOnMobile = false,
  styleName = "radix-nova",
  caption,
  ...props
}: React.ComponentProps<"div"> & {
  name: string
  styleName?: string
  align?: "center" | "start" | "end"
  description?: string
  hideCode?: boolean
  chromeLessOnMobile?: boolean
  previewClassName?: string
  caption?: string
}) {
  const Component = getRegistryComponent(name, styleName)

  if (!Component) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        Component{" "}
        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
          {name}
        </code>{" "}
        not found in registry.
      </p>
    )
  }

  const content = (
    <ComponentPreviewTabs
      className={className}
      previewClassName={previewClassName}
      align={align}
      hideCode={hideCode}
      component={React.createElement(Component)}
      source={
        <ComponentSource
          name={name}
          collapsible={false}
          styleName={styleName}
        />
      }
      sourcePreview={
        <ComponentSource
          name={name}
          collapsible={false}
          styleName={styleName}
          maxLines={3}
        />
      }
      chromeLessOnMobile={chromeLessOnMobile}
      {...props}
    />
  )

  if (caption) {
    return (
      <DevFeedback name={`Preview.${name}`}>
        <figure
          data-hide-code={hideCode}
          className="flex flex-col data-[hide-code=true]:gap-4"
        >
          {content}
          <figcaption className="-mt-8 text-center text-sm text-muted-foreground data-[hide-code=true]:mt-0">
            {caption}
          </figcaption>
        </figure>
      </DevFeedback>
    )
  }

  return <DevFeedback name={`Preview.${name}`}>{content}</DevFeedback>
}
