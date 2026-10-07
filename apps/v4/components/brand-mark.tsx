import { cn } from "cn"

// The Real Good Site mark, inline so it follows the site's theme toggle (an <img>
// of icon.svg can only follow the OS colour scheme). The geometry and colours
// are brand/mark.svg; tests/brand-mark.test.ts fails if they drift apart.
export function BrandMark({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="6 4 54 54"
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
      {...props}
    >
      <path
        className="fill-[#24173f] dark:fill-[#f6f0e1]"
        d="M6 6H39.35A14 14 0 0 0 58 24.65V58H6Z"
      />
      <circle
        className="fill-[#7c3aed] dark:fill-[#a78bfa]"
        cx="52"
        cy="12"
        r="8"
      />
    </svg>
  )
}
