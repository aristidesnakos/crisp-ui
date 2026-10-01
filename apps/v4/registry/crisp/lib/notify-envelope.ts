/**
 * Pure helpers for the status-and-notify pattern. No network, no React, so they
 * are safe to unit test and to reuse on a server.
 */

/**
 * One person and which channels they are switched on for. Same shape as
 * `RosterPerson` in `recipient-roster`, so the two fit together without a
 * conversion.
 */
export interface RosterPerson {
  email: string
  channels: Record<string, boolean>
}

/** Build a roster from one saved list of addresses per channel. */
export function peopleFromLists(
  lists: Record<string, string[]>,
  channelKeys: string[]
): RosterPerson[] {
  const people = new Map<string, RosterPerson>()
  for (const key of channelKeys) {
    for (const raw of lists[key] ?? []) {
      const email = raw.trim().toLowerCase()
      if (!email) continue
      let person = people.get(email)
      if (!person) {
        person = {
          email,
          channels: Object.fromEntries(channelKeys.map((k) => [k, false])),
        }
        people.set(email, person)
      }
      person.channels[key] = true
    }
  }
  return [...people.values()]
}

/** The addresses switched on for one channel, in roster order. */
export function listForChannel(people: RosterPerson[], key: string): string[] {
  return people.filter((p) => p.channels[key]).map((p) => p.email)
}

const normalize = (list: string[]) =>
  [
    ...new Set(list.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ].sort()

/**
 * Order-, case- and duplicate-insensitive: neither a reordered list nor
 * "Mara@Example.org" versus "mara@example.org" is a change worth saving.
 */
export function sameList(a: string[], b: string[]): boolean {
  const sortedA = normalize(a)
  const sortedB = normalize(b)
  return (
    sortedA.length === sortedB.length &&
    sortedA.every((email, i) => email === sortedB[i])
  )
}

/**
 * Apply a newly SAVED list for one channel to the roster, leaving every other
 * channel's local (possibly unsaved) switches alone. People who are in the list
 * but not yet on the roster are added.
 */
export function applySavedChannel(
  people: RosterPerson[],
  key: string,
  saved: string[],
  channelKeys: string[]
): RosterPerson[] {
  const wanted = new Set(normalize(saved))
  const next = people.map((person) => ({
    ...person,
    channels: { ...person.channels, [key]: wanted.has(person.email) },
  }))
  for (const email of wanted) {
    if (!next.some((person) => person.email === email)) {
      next.push({
        email,
        channels: Object.fromEntries(channelKeys.map((k) => [k, k === key])),
      })
    }
  }
  return next
}

/**
 * The envelope for a notice sent as ONE message to a small group who are meant
 * to see one another: everyone on `to`, the copied parties on visible `cc` and
 * `replyTo`. An address never appears on both `to` and `cc`.
 *
 * For a list whose members must not learn about each other, send one message
 * per recipient instead and do not use this.
 */
export function buildEnvelope(
  recipients: string[],
  copied: string[]
): { to: string[]; cc: string[]; replyTo: string[] } {
  const seen = new Set<string>()
  const to = recipients
    .map((address) => address.trim())
    .filter(
      (address) =>
        address &&
        !seen.has(address.toLowerCase()) &&
        seen.add(address.toLowerCase())
    )
  const toSet = new Set(to.map((address) => address.toLowerCase()))
  const cleanCopied = copied.map((address) => address.trim()).filter(Boolean)
  return {
    to,
    cc: cleanCopied.filter((address) => !toSet.has(address.toLowerCase())),
    replyTo: cleanCopied,
  }
}
