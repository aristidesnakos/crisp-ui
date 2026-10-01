import { describe, expect, it } from "vitest"

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
  type TableView,
} from "../registry/crisp/lib/table-view"

interface Gauge {
  id: string
  owner: string
  due: string | null
  overdue: boolean
}

const GAUGES: Gauge[] = [
  { id: "g1", owner: "Mara", due: "2026-09-01", overdue: true },
  { id: "g2", owner: "Jules", due: "2026-11-15", overdue: false },
  { id: "g3", owner: "Mara", due: "2026-08-20", overdue: true },
  { id: "g4", owner: "Ines", due: null, overdue: false },
]
const getId = (g: Gauge) => g.id

const VIEWS: TableView<Gauge>[] = [
  { key: "all", label: "All", filter: () => true },
  { key: "overdue", label: "Overdue", filter: (g) => g.overdue },
  { key: "none", label: "Nothing", filter: () => false },
]

describe("uniqueById", () => {
  it("keeps the first row for a repeated id", () => {
    const rows = [
      { id: "a", n: 1 },
      { id: "b", n: 2 },
      { id: "a", n: 3 },
    ]
    expect(uniqueById(rows, (r) => r.id)).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 2 },
    ])
  })

  it("handles an empty list", () => {
    expect(uniqueById([], getId)).toEqual([])
  })
})

describe("views", () => {
  it("filters in source order and does not change the input", () => {
    const copy = [...GAUGES]
    expect(filterByView(GAUGES, VIEWS[1]).map(getId)).toEqual(["g1", "g3"])
    expect(GAUGES).toEqual(copy)
  })

  it("keeps every row when there is no view, as a new array", () => {
    const result = filterByView(GAUGES, undefined)
    expect(result).toEqual(GAUGES)
    expect(result).not.toBe(GAUGES)
  })

  it("counts each view against the same total", () => {
    expect(countViews(GAUGES, VIEWS)).toEqual([
      { key: "all", label: "All", count: 4, total: 4 },
      { key: "overdue", label: "Overdue", count: 2, total: 4 },
      { key: "none", label: "Nothing", count: 0, total: 4 },
    ])
  })

  it("counts an empty list as zero of zero", () => {
    expect(countViews([], VIEWS).map((v) => [v.count, v.total])).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ])
    expect(filterByView([], VIEWS[1])).toEqual([])
  })

  it("falls back to the first view for an unknown key, and to none without views", () => {
    expect(findView(VIEWS, "overdue")?.key).toBe("overdue")
    expect(findView(VIEWS, "missing")?.key).toBe("all")
    expect(findView(VIEWS, undefined)?.key).toBe("all")
    expect(findView([], "all")).toBeUndefined()
    expect(findView(undefined, "all")).toBeUndefined()
  })
})

describe("formatShown", () => {
  it("shows the denominator with the noun", () => {
    expect(formatShown(7, 18, "gauge")).toBe("7 of 18 gauges")
  })

  it("uses the singular only when the total is one", () => {
    expect(formatShown(1, 1, "gauge")).toBe("1 of 1 gauge")
    expect(formatShown(0, 1, "gauge")).toBe("0 of 1 gauge")
    expect(formatShown(1, 2, "gauge")).toBe("1 of 2 gauges")
  })

  it("takes an explicit plural and defaults to row/rows", () => {
    expect(formatShown(2, 5, "person", "people")).toBe("2 of 5 people")
    expect(formatShown(0, 0)).toBe("0 of 0 rows")
  })
})

describe("sortRows", () => {
  it("sorts text ascending and descending", () => {
    expect(sortRows(GAUGES, (g) => g.owner, "asc").map(getId)).toEqual([
      "g4",
      "g2",
      "g1",
      "g3",
    ])
    expect(sortRows(GAUGES, (g) => g.owner, "desc").map(getId)).toEqual([
      "g1",
      "g3",
      "g2",
      "g4",
    ])
  })

  it("keeps tied rows in source order in both directions", () => {
    // g1 and g3 tie on owner "Mara".
    const asc = sortRows(GAUGES, (g) => g.owner, "asc").map(getId)
    const desc = sortRows(GAUGES, (g) => g.owner, "desc").map(getId)
    expect(asc.indexOf("g1")).toBeLessThan(asc.indexOf("g3"))
    expect(desc.indexOf("g1")).toBeLessThan(desc.indexOf("g3"))
  })

  it("puts missing values last, ascending and descending", () => {
    expect(sortRows(GAUGES, (g) => g.due, "asc").map(getId)).toEqual([
      "g3",
      "g1",
      "g2",
      "g4",
    ])
    expect(sortRows(GAUGES, (g) => g.due, "desc").map(getId)).toEqual([
      "g2",
      "g1",
      "g3",
      "g4",
    ])
  })

  it("treats undefined, NaN and invalid dates as missing, keeping their order", () => {
    const rows = [
      { id: "a", v: undefined as number | undefined },
      { id: "b", v: 2 },
      { id: "c", v: Number.NaN },
      { id: "d", v: 1 },
    ]
    expect(sortRows(rows, (r) => r.v, "asc").map((r) => r.id)).toEqual([
      "d",
      "b",
      "a",
      "c",
    ])
    const dates = [
      { id: "a", d: new Date("not a date") },
      { id: "b", d: new Date("2026-01-02") },
      { id: "c", d: new Date("2026-01-01") },
    ]
    expect(sortRows(dates, (r) => r.d, "desc").map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ])
  })

  it("sorts numbers numerically and numbered text naturally", () => {
    expect(sortRows([10, 9, 100], (n) => n).map(String)).toEqual([
      "9",
      "10",
      "100",
    ])
    expect(
      sortRows(["gauge 10", "gauge 9", "gauge 2"], (s) => s, "asc")
    ).toEqual(["gauge 2", "gauge 9", "gauge 10"])
  })

  it("puts false before true", () => {
    expect(sortRows(GAUGES, (g) => g.overdue, "asc").map(getId)).toEqual([
      "g2",
      "g4",
      "g1",
      "g3",
    ])
  })

  it("does not change its input and handles an empty list", () => {
    const copy = [...GAUGES]
    sortRows(GAUGES, (g) => g.owner, "desc")
    expect(GAUGES).toEqual(copy)
    expect(sortRows([], () => 1)).toEqual([])
  })
})

describe("nextSort", () => {
  it("cycles ascending, descending, off", () => {
    const first = nextSort(null, "due")
    expect(first).toEqual({ key: "due", direction: "asc" })
    const second = nextSort(first, "due")
    expect(second).toEqual({ key: "due", direction: "desc" })
    expect(nextSort(second, "due")).toBeNull()
  })

  it("starts ascending on a different column", () => {
    expect(nextSort({ key: "due", direction: "desc" }, "owner")).toEqual({
      key: "owner",
      direction: "asc",
    })
  })
})

describe("selection", () => {
  it("toggles one id on and off", () => {
    expect(toggleId([], "a")).toEqual(["a"])
    expect(toggleId(["a"], "b")).toEqual(["a", "b"])
    expect(toggleId(["a", "b"], "a")).toEqual(["b"])
  })

  it("removes every copy of a duplicated id and never adds a duplicate", () => {
    expect(toggleId(["a", "a", "b"], "a")).toEqual(["b"])
    expect(toggleId(["a", "a"], "b")).toEqual(["a", "b"])
  })

  it("does not change the list it is given", () => {
    const selected = ["a", "b"]
    toggleId(selected, "a")
    selectAllVisible(selected, ["c"])
    pruneSelection(selected, ["a"])
    deselectAllVisible(selected, ["a"])
    expect(selected).toEqual(["a", "b"])
  })

  it("selects all visible rows and keeps earlier picks", () => {
    expect(selectAllVisible(["z"], ["a", "b"])).toEqual(["z", "a", "b"])
    expect(selectAllVisible(["a"], ["a", "b", "b"])).toEqual(["a", "b"])
    expect(selectAllVisible([], [])).toEqual([])
  })

  it("selects only the rows the active view keeps", () => {
    const visible = filterByView(GAUGES, VIEWS[1]).map(getId)
    expect(selectAllVisible([], visible)).toEqual(["g1", "g3"])
  })

  it("deselects the visible rows and leaves the rest", () => {
    expect(deselectAllVisible(["a", "b", "c"], ["a", "c"])).toEqual(["b"])
    expect(deselectAllVisible([], ["a"])).toEqual([])
  })

  it("clears to an empty list", () => {
    expect(clearSelection()).toEqual([])
  })

  it("prunes ids whose row has gone", () => {
    expect(pruneSelection(["a", "b", "c"], ["a", "c"])).toEqual(["a", "c"])
    expect(pruneSelection(["a"], [])).toEqual([])
    expect(pruneSelection([], ["a"])).toEqual([])
    expect(pruneSelection(["a", "a", "b"], ["a", "b"])).toEqual(["a", "b"])
  })

  it("prunes when a filter hides a selected row", () => {
    const selected = ["g1", "g2"]
    const overdue = filterByView(GAUGES, VIEWS[1]).map(getId)
    expect(pruneSelection(selected, overdue)).toEqual(["g1"])
    // Switching to a view that keeps nothing selects nothing.
    const none = filterByView(GAUGES, VIEWS[2]).map(getId)
    expect(pruneSelection(selected, none)).toEqual([])
  })

  it("reports none, some or all of the visible rows", () => {
    expect(selectionState([], ["a", "b"])).toBe("none")
    expect(selectionState(["a"], ["a", "b"])).toBe("some")
    expect(selectionState(["a", "b"], ["a", "b"])).toBe("all")
    expect(selectionState(["a", "b", "x"], ["a", "b"])).toBe("all")
    expect(selectionState(["x"], ["a", "b"])).toBe("none")
    expect(selectionState(["a"], [])).toBe("none")
    expect(selectionState(["a", "a"], ["a", "a"])).toBe("all")
  })

  it("compares selections ignoring order and repeats", () => {
    expect(sameSelection(["a", "b"], ["b", "a"])).toBe(true)
    expect(sameSelection(["a", "a"], ["a"])).toBe(true)
    expect(sameSelection(["a"], ["a", "b"])).toBe(false)
    expect(sameSelection([], [])).toBe(true)
  })

  it("returns the selected rows in row order, one per id", () => {
    expect(
      selectedRows(GAUGES, ["g3", "g1", "nope"], getId).map(getId)
    ).toEqual(["g1", "g3"])
    const dup = [...GAUGES, { ...GAUGES[0], owner: "Copy" }]
    expect(selectedRows(dup, ["g1"], getId)).toEqual([GAUGES[0]])
    expect(selectedRows([], ["g1"], getId)).toEqual([])
  })
})

describe("isStale", () => {
  const now = Date.parse("2026-10-01T12:00:00Z")

  it("is fresh within the window and stale after it", () => {
    expect(isStale("2026-10-01T11:30:00Z", now, 60)).toBe(false)
    expect(isStale("2026-10-01T11:00:00Z", now, 60)).toBe(false)
    expect(isStale("2026-10-01T10:59:00Z", now, 60)).toBe(true)
  })

  it("accepts a Date or a timestamp", () => {
    expect(isStale(new Date(now - 5 * 60_000), now, 10)).toBe(false)
    expect(isStale(now - 20 * 60_000, now, 10)).toBe(true)
  })

  it("treats an unreadable time as stale and a future time as fresh", () => {
    expect(isStale("yesterday-ish", now, 60)).toBe(true)
    expect(isStale(now + 5 * 60_000, now, 60)).toBe(false)
  })
})
