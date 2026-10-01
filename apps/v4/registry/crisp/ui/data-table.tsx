"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Clock,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  clearSelection,
  countViews,
  deselectAllVisible,
  filterByView,
  findView,
  formatShown,
  isStale,
  nextSort,
  pruneSelection,
  sameSelection,
  selectAllVisible,
  selectedRows,
  selectionState,
  sortRows,
  toggleId,
  uniqueById,
  type SortState,
  type SortValue,
  type TableView,
} from "@/registry/crisp/lib/table-view"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Checkbox } from "@/registry/new-york-v4/ui/checkbox"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/new-york-v4/ui/table"

/** A named preset. Same shape as `TableView` in `table-view`. */
export type DataTableView<T> = TableView<T>

export interface DataTableColumn<T> {
  /** React key, and the key `defaultSort` and `onSortChange` use. Unique. */
  key: string
  /** Column heading. Also named in the "Sorted by …" announcement. */
  header: string
  /** What the cell shows. Pair a colour with text or an icon, never colour alone. */
  cell: (row: T) => React.ReactNode
  /** Makes the column sortable. Null, undefined and NaN sort last. */
  sortValue?: (row: T) => SortValue
  /** Default "left". Use "right" for numbers. */
  align?: "left" | "right"
  /** Renders this column's cells as row headers. Defaults to the first column. */
  rowHeader?: boolean
  className?: string
}

export interface DataTableProps<T>
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** Every row, before any view is applied. A repeated id keeps its first row. */
  rows: T[]
  columns: DataTableColumn<T>[]
  /** A stable, unique id for a row. Selection is kept by id. */
  getRowId: (row: T) => string
  /** What a person calls this row, e.g. "Gauge G-104". Names its checkbox. */
  rowLabel: (row: T) => string
  /** Names the table for screen readers. Not shown. */
  caption: string
  /** One row, e.g. "gauge". Default "row". */
  noun?: string
  /** Plural of `noun`. Default `noun + "s"`. */
  nounPlural?: string
  /** Named presets, one active at a time. Each button shows its live count. */
  views?: DataTableView<T>[]
  /** Controlled: the key of the active view. Unknown keys fall back to the first view. */
  activeView?: string
  /** Uncontrolled starting view. Default: the first view. */
  defaultActiveView?: string
  onActiveViewChange?: (key: string) => void
  /** Set false to drop the checkbox column. Default true. */
  selectable?: boolean
  /** Controlled selection, by row id. Omit to let the table keep it. */
  selectedIds?: string[]
  /** Uncontrolled starting selection. */
  defaultSelectedIds?: string[]
  /**
   * Called with the next ids after a toggle, select-all, clear, or when rows
   * disappear (a view change or new data). It never includes a hidden row.
   */
  onSelectionChange?: (ids: string[]) => void
  /** Rendered beside the count. Receives the selected rows, in table order. */
  actions?: (selectedRows: T[]) => React.ReactNode
  /** Starting sort. Click a sortable heading to cycle ascending, descending, off. */
  defaultSort?: SortState
  onSortChange?: (sort: SortState) => void
  /** When the rows were fetched. Shows "As of <time>". Omit to hide the line. */
  asOf?: Date | string | number
  /** How old `asOf` may get before the line warns. Default 60. */
  staleAfterMinutes?: number
  /** Format `asOf` for display. Default: locale date and time. */
  formatAsOf?: (date: Date) => string
  /** Adds a Refresh button to the freshness line. */
  onRefresh?: () => void
  /**
   * The rows could not be loaded. `true` shows a default message; a string is
   * used as the detail line. Replaces the table, and nothing can be selected.
   */
  error?: boolean | string
  /** Adds a "Try again" button to the error state. */
  onRetry?: () => void
  /** Replaces the default message shown when `rows` is empty. */
  emptyState?: React.ReactNode
  /** Replaces the default message shown when the active view keeps no rows. */
  noMatchState?: React.ReactNode
}

// A stock checkbox draws a tick for "indeterminate" too. Hide the tick and draw
// a dash, so "some selected" looks different from "all selected".
const INDETERMINATE =
  "relative data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:[&_svg]:hidden data-[state=indeterminate]:before:absolute data-[state=indeterminate]:before:top-1/2 data-[state=indeterminate]:before:left-1/2 data-[state=indeterminate]:before:h-0.5 data-[state=indeterminate]:before:w-2 data-[state=indeterminate]:before:-translate-x-1/2 data-[state=indeterminate]:before:-translate-y-1/2 data-[state=indeterminate]:before:rounded-full data-[state=indeterminate]:before:bg-current data-[state=indeterminate]:before:content-['']"

// Widens the click target well past the 16px box without changing the layout.
const HIT_AREA = "relative after:absolute after:-inset-3 after:content-['']"

const defaultFormatAsOf = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)

/**
 * A list of rows with named views, row selection and an action slot that gets
 * the selected rows. See /docs/components/data-table.
 */
function DataTable<T>({
  rows,
  columns,
  getRowId,
  rowLabel,
  caption,
  noun = "row",
  nounPlural,
  views,
  activeView,
  defaultActiveView,
  onActiveViewChange,
  selectable = true,
  selectedIds: selectedIdsProp,
  defaultSelectedIds,
  onSelectionChange,
  actions,
  defaultSort = null,
  onSortChange,
  asOf,
  staleAfterMinutes = 60,
  formatAsOf = defaultFormatAsOf,
  onRefresh,
  error,
  onRetry,
  emptyState,
  noMatchState,
  className,
  ref,
  ...props
}: DataTableProps<T>) {
  const plural = nounPlural ?? `${noun}s`
  const hasError = Boolean(error)

  const [internalView, setInternalView] = React.useState(defaultActiveView)
  const [sort, setSort] = React.useState<SortState>(defaultSort)
  const [internalSelected, setInternalSelected] = React.useState<string[]>(
    defaultSelectedIds ?? []
  )
  // Polite message for changes that are otherwise only visible: a view or sort.
  const [status, setStatus] = React.useState("")
  // Read after mount, so the server and client render the same text first.
  const [now, setNow] = React.useState<number | null>(null)

  const asOfTime = asOf === undefined ? undefined : new Date(asOf).getTime()
  React.useEffect(() => {
    if (asOfTime === undefined) return
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const timer = setInterval(tick, 60_000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [asOfTime])

  // An error leaves nothing to show, so nothing can be selected or acted on.
  const allRows = hasError ? [] : uniqueById(rows, getRowId)
  const view = findView(views, activeView ?? internalView)
  const counts = views ? countViews(allRows, views) : []
  const sortColumn = sort
    ? columns.find((column) => column.key === sort.key && column.sortValue)
    : undefined
  const filtered = filterByView(allRows, view)
  const visibleRows =
    sort && sortColumn?.sortValue
      ? sortRows(filtered, sortColumn.sortValue, sort.direction)
      : filtered
  const visibleIds = visibleRows.map(getRowId)

  // Selection only ever holds rows that are on screen, so an action never
  // reaches a row the person cannot see. Tell the owner when that trims it.
  const selectedIds = selectedIdsProp ?? internalSelected
  const selected = pruneSelection(selectedIds, visibleIds)
  const trimmed = !sameSelection(selected, selectedIds)
  function setSelected(next: string[]) {
    if (selectedIdsProp === undefined) setInternalSelected(next)
    onSelectionChange?.(next)
  }
  // Uncontrolled: drop the hidden rows from our own state while rendering (React's
  // way to adjust state from props), and remember what we trimmed to so the owner
  // can be told once the render is committed.
  const [trimmedTo, setTrimmedTo] = React.useState<string[] | null>(null)
  const notified = React.useRef<string[] | null>(null)
  if (trimmed && selectedIdsProp === undefined) {
    setInternalSelected(selected)
    setTrimmedTo(selected)
  }
  React.useEffect(() => {
    if (selectedIdsProp !== undefined) {
      // Controlled: the owner holds the ids, so ask it to drop the hidden ones.
      if (trimmed) onSelectionChange?.(selected)
    } else if (trimmedTo && trimmedTo !== notified.current) {
      notified.current = trimmedTo
      onSelectionChange?.(trimmedTo)
    }
  })

  const chosenRows = selectedRows(visibleRows, selected, getRowId)
  const chosen = new Set(selected)
  const state = selectionState(selected, visibleIds)
  const rowHeaderKey =
    columns.find((column) => column.rowHeader)?.key ?? columns[0]?.key
  const nounFor = (n: number) => (n === 1 ? noun : plural)

  function chooseView(next: DataTableView<T>) {
    if (activeView === undefined) setInternalView(next.key)
    onActiveViewChange?.(next.key)
    const count = counts.find((item) => item.key === next.key)
    setStatus(
      `${next.label}: showing ${formatShown(count?.count ?? 0, allRows.length, noun, plural)}.`
    )
  }

  function sortBy(column: DataTableColumn<T>) {
    const next = nextSort(sort, column.key)
    setSort(next)
    onSortChange?.(next)
    setStatus(
      next
        ? `Sorted by ${column.header}, ${next.direction === "asc" ? "ascending" : "descending"}.`
        : "Sorting cleared."
    )
  }

  const stale =
    asOfTime !== undefined &&
    now !== null &&
    isStale(asOfTime, now, staleAfterMinutes)
  const asOfDate = asOfTime === undefined ? undefined : new Date(asOfTime)
  const asOfValid = asOfDate !== undefined && !Number.isNaN(asOfDate.getTime())

  const showCount = !hasError && allRows.length > 0
  // Views only mean something when there are rows to filter.
  const showViews = Boolean(views && views.length > 0) && showCount
  const otherView =
    view && views
      ? counts.find((item) => item.key !== view.key && item.count > 0)
      : undefined

  return (
    <div
      ref={ref}
      data-slot="data-table"
      className={cn("space-y-3", className)}
      {...props}
    >
      {(showViews || asOfDate) && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {showViews && views ? (
            <div
              role="group"
              aria-label="Saved views"
              className="flex flex-wrap gap-2"
            >
              {views.map((item) => {
                const count = counts.find((c) => c.key === item.key)
                const active = item.key === view?.key
                return (
                  <Button
                    key={item.key}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    aria-pressed={active}
                    onClick={() => chooseView(item)}
                  >
                    {item.label}
                    <span className="tabular-nums opacity-80">
                      {count?.count ?? 0}
                    </span>
                    <span className="sr-only">of {allRows.length}</span>
                  </Button>
                )
              })}
            </div>
          ) : (
            <span />
          )}
          {asOfDate && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {stale ? (
                <TriangleAlert
                  className="size-4 text-foreground"
                  aria-hidden="true"
                />
              ) : (
                <Clock className="size-4" aria-hidden="true" />
              )}
              <span>
                As of{" "}
                {asOfValid ? (
                  <time
                    dateTime={asOfDate.toISOString()}
                    suppressHydrationWarning
                  >
                    {formatAsOf(asOfDate)}
                  </time>
                ) : (
                  "an unknown time"
                )}
              </span>
              <span
                role="status"
                className={cn(
                  stale ? "font-medium text-foreground" : "sr-only"
                )}
              >
                {stale
                  ? "May be out of date. Refresh before you act on it."
                  : ""}
              </span>
              {onRefresh && (
                <Button variant="ghost" size="sm" onClick={onRefresh}>
                  Refresh
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {(showCount || actions) && (
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground tabular-nums">
            {showCount && (
              <p>
                Showing{" "}
                {formatShown(visibleRows.length, allRows.length, noun, plural)}
              </p>
            )}
            {selectable && selected.length > 0 && (
              <>
                <span
                  aria-hidden="true"
                  className="font-medium text-foreground"
                >
                  {selected.length} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Clear selection"
                  onClick={() => setSelected(clearSelection())}
                >
                  Clear
                </Button>
              </>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-3">
              {actions(chosenRows)}
            </div>
          )}
        </div>
      )}

      {hasError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 px-6 py-8 text-center"
        >
          <TriangleAlert
            className="mx-auto mb-2 size-5 text-destructive"
            aria-hidden="true"
          />
          <p className="font-medium">Couldn’t load this list</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {typeof error === "string"
              ? error
              : "The data didn’t arrive, so nothing is shown and nothing was changed. Try again, and if it keeps failing, check the source."}
          </p>
          {onRetry && (
            <Button variant="outline" className="mt-4" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      ) : allRows.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-8 text-center">
          {emptyState ?? (
            <>
              <p className="font-medium">No {plural} yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing has been added, or the source returned no records. If
                you expected some, check the source.
              </p>
            </>
          )}
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-8 text-center">
          {noMatchState ?? (
            <>
              <p className="font-medium">
                No {plural} in “{view?.label}”
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {allRows.length === 1
                  ? `The only ${noun} is`
                  : `All ${allRows.length} ${plural} are`}{" "}
                in another view.
              </p>
              {otherView && views && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    const target = views.find((v) => v.key === otherView.key)
                    if (target) chooseView(target)
                  }}
                >
                  Show {otherView.label} ({otherView.count})
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label={`Select all ${visibleRows.length} ${nounFor(visibleRows.length)} shown`}
                    checked={
                      state === "all"
                        ? true
                        : state === "some"
                          ? "indeterminate"
                          : false
                    }
                    className={cn(HIT_AREA, INDETERMINATE)}
                    onCheckedChange={() =>
                      setSelected(
                        state === "all"
                          ? deselectAllVisible(selected, visibleIds)
                          : selectAllVisible(selected, visibleIds)
                      )
                    }
                  />
                </TableHead>
              )}
              {columns.map((column) => {
                const sorted =
                  sort?.key === column.key && column.sortValue
                    ? sort.direction
                    : undefined
                const SortIcon =
                  sorted === "asc"
                    ? ArrowUp
                    : sorted === "desc"
                      ? ArrowDown
                      : ChevronsUpDown
                return (
                  <TableHead
                    key={column.key}
                    scope="col"
                    aria-sort={
                      sorted
                        ? sorted === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn(
                      column.align === "right" && "text-right",
                      column.className
                    )}
                  >
                    {column.sortValue ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-mx-2 h-8 px-2 font-medium"
                        onClick={() => sortBy(column)}
                      >
                        {column.header}
                        <SortIcon
                          className={cn("size-3.5", !sorted && "opacity-50")}
                          aria-hidden="true"
                        />
                      </Button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => {
              const id = getRowId(row)
              const isSelected = chosen.has(id)
              return (
                <TableRow
                  key={id}
                  data-state={isSelected ? "selected" : undefined}
                >
                  {selectable && (
                    <TableCell className="w-10">
                      <Checkbox
                        aria-label={`Select ${rowLabel(row)}`}
                        checked={isSelected}
                        className={HIT_AREA}
                        onCheckedChange={() =>
                          setSelected(toggleId(selected, id))
                        }
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const cellClass = cn(
                      column.align === "right" && "text-right",
                      column.className
                    )
                    return column.key === rowHeaderKey ? (
                      <TableHead
                        key={column.key}
                        scope="row"
                        className={cn("h-auto p-2 font-medium", cellClass)}
                      >
                        {column.cell(row)}
                      </TableHead>
                    ) : (
                      <TableCell key={column.key} className={cellClass}>
                        {column.cell(row)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <p role="status" className="sr-only">
        {selectable ? `${selected.length} selected` : ""}
      </p>
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  )
}

export { DataTable }
