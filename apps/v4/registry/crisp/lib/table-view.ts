/**
 * Pure helpers for the data-table pattern: named views with counts, a stable
 * sort, and selection that never outlives the rows it points at. No React and
 * no network, so they are safe to unit test and to reuse on a server.
 *
 * Selection is a list of row ids (strings). Every helper returns a new list
 * and never changes the one it is given.
 */

/** A named preset: the rows it keeps are the ones `filter` returns true for. */
export interface TableView<T> {
  /** Unique within the table. */
  key: string
  /** Shown on the view's button, e.g. "Overdue". */
  label: string
  filter: (row: T) => boolean
}

export interface ViewCount {
  key: string
  label: string
  /** Rows this view keeps. */
  count: number
  /** All rows, whatever the view. The same for every view. */
  total: number
}

export type SortDirection = "asc" | "desc"

/** The column being sorted and which way. `null` means source order. */
export type SortState = { key: string; direction: SortDirection } | null

/** What a column hands the sort. Null, undefined, NaN and invalid dates sort last. */
export type SortValue = string | number | boolean | Date | null | undefined

export type SelectionState = "none" | "some" | "all"

/**
 * Drop rows whose id was already seen, keeping the first. Two rows with one id
 * cannot be told apart by a selection, so the table treats the id as the row.
 */
export function uniqueById<T>(rows: readonly T[], getId: (row: T) => string) {
  const seen = new Set<string>()
  const result: T[] = []
  for (const row of rows) {
    const id = getId(row)
    if (seen.has(id)) continue
    seen.add(id)
    result.push(row)
  }
  return result
}

/** The view whose key matches, else the first view, else undefined. */
export function findView<T>(
  views: readonly TableView<T>[] | undefined,
  key: string | undefined
): TableView<T> | undefined {
  if (!views || views.length === 0) return undefined
  return views.find((view) => view.key === key) ?? views[0]
}

/** The rows a view keeps, in their original order. No view keeps every row. */
export function filterByView<T>(
  rows: readonly T[],
  view: TableView<T> | undefined
): T[] {
  return view ? rows.filter(view.filter) : [...rows]
}

/**
 * How many rows each view keeps out of how many in all. Show both, "7 of 18",
 * so nobody reads a filtered list as the whole of it.
 */
export function countViews<T>(
  rows: readonly T[],
  views: readonly TableView<T>[]
): ViewCount[] {
  return views.map((view) => ({
    key: view.key,
    label: view.label,
    count: rows.filter(view.filter).length,
    total: rows.length,
  }))
}

/** "7 of 18 gauges". The noun follows the total, so "1 of 1 gauge". */
export function formatShown(
  count: number,
  total: number,
  noun = "row",
  nounPlural = `${noun}s`
): string {
  return `${count} of ${total} ${total === 1 ? noun : nounPlural}`
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

function isMissing(value: SortValue): value is null | undefined {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value)) ||
    (value instanceof Date && Number.isNaN(value.getTime()))
  )
}

function compareValues(a: NonNullable<SortValue>, b: NonNullable<SortValue>) {
  if (typeof a === "number" && typeof b === "number") return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b)
  }
  // Mixed or string values: compare as text, "item 2" before "item 10".
  return collator.compare(String(a), String(b))
}

/**
 * A stable sort: rows that tie keep their source order, in either direction.
 * Rows with no value (see `SortValue`) go last whether ascending or
 * descending, so the gaps never hide the rows that do have a value.
 */
export function sortRows<T>(
  rows: readonly T[],
  getValue: (row: T) => SortValue,
  direction: SortDirection = "asc"
): T[] {
  const sign = direction === "asc" ? 1 : -1
  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((a, b) => {
      const aMissing = isMissing(a.value)
      const bMissing = isMissing(b.value)
      if (aMissing || bMissing) {
        if (aMissing && bMissing) return a.index - b.index
        return aMissing ? 1 : -1
      }
      const order = compareValues(
        a.value as NonNullable<SortValue>,
        b.value as NonNullable<SortValue>
      )
      return order === 0 ? a.index - b.index : order * sign
    })
    .map((entry) => entry.row)
}

/** The next sort after a click on a column header: ascending, descending, off. */
export function nextSort(current: SortState, key: string): SortState {
  if (!current || current.key !== key) return { key, direction: "asc" }
  return current.direction === "asc" ? { key, direction: "desc" } : null
}

/** A selection with duplicates removed, first occurrence kept. */
function dedupe(ids: readonly string[]) {
  return [...new Set(ids)]
}

/** Add the id if it is not selected, remove it if it is. */
export function toggleId(selected: readonly string[], id: string): string[] {
  const ids = dedupe(selected)
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

/**
 * Select every row that is on screen, keeping what was already selected.
 * "Visible" means the rows left after the active view, not a page of them.
 */
export function selectAllVisible(
  selected: readonly string[],
  visibleIds: readonly string[]
): string[] {
  return dedupe([...selected, ...visibleIds])
}

/** Deselect every visible row. Ids that are not visible stay as they were. */
export function deselectAllVisible(
  selected: readonly string[],
  visibleIds: readonly string[]
): string[] {
  const visible = new Set(visibleIds)
  return dedupe(selected).filter((id) => !visible.has(id))
}

export function clearSelection(): string[] {
  return []
}

/**
 * Keep only ids that still exist. Call it when the view or the data changes so
 * a bulk action never reaches a row the person can no longer see.
 */
export function pruneSelection(
  selected: readonly string[],
  availableIds: readonly string[]
): string[] {
  const available = new Set(availableIds)
  return dedupe(selected).filter((id) => available.has(id))
}

/** Whether none, some or every visible row is selected. No rows counts as none. */
export function selectionState(
  selected: readonly string[],
  visibleIds: readonly string[]
): SelectionState {
  if (visibleIds.length === 0) return "none"
  const chosen = new Set(selected)
  const count = new Set(visibleIds).size
  const hits = [...new Set(visibleIds)].filter((id) => chosen.has(id)).length
  if (hits === 0) return "none"
  return hits === count ? "all" : "some"
}

/** The same ids, whatever the order or repeats. */
export function sameSelection(
  a: readonly string[],
  b: readonly string[]
): boolean {
  const setA = new Set(a)
  const setB = new Set(b)
  return setA.size === setB.size && [...setA].every((id) => setB.has(id))
}

/** The selected rows, in row order, one per id. */
export function selectedRows<T>(
  rows: readonly T[],
  selected: readonly string[],
  getId: (row: T) => string
): T[] {
  const chosen = new Set(selected)
  return uniqueById(rows, getId).filter((row) => chosen.has(getId(row)))
}

/**
 * Whether the data is older than `maxAgeMinutes` at `now` (milliseconds). A
 * time that cannot be read counts as stale, because nobody can vouch for it.
 */
export function isStale(
  asOf: Date | string | number,
  now: number,
  maxAgeMinutes: number
): boolean {
  const time = new Date(asOf).getTime()
  if (Number.isNaN(time)) return true
  return now - time > maxAgeMinutes * 60_000
}
