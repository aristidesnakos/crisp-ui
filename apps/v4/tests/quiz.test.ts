import { describe, expect, it } from "vitest"

import {
  checkQuestions,
  emptyPicks,
  isCorrect,
  optionLetter,
  tally,
} from "../registry/crisp/lib/quiz"

const q = (answer: number, options: unknown[] = ["a", "b", "c"]) => ({
  answer,
  options,
})

describe("optionLetter", () => {
  it("counts A, B, C from zero", () => {
    expect(optionLetter(0)).toBe("A")
    expect(optionLetter(1)).toBe("B")
    expect(optionLetter(25)).toBe("Z")
  })

  it("wraps to AA after Z", () => {
    expect(optionLetter(26)).toBe("AA")
    expect(optionLetter(27)).toBe("AB")
    expect(optionLetter(26 + 26 * 26)).toBe("AAA")
  })

  it("returns an empty string for negatives and non-integers", () => {
    expect(optionLetter(-1)).toBe("")
    expect(optionLetter(1.5)).toBe("")
    expect(optionLetter(Number.NaN)).toBe("")
    expect(optionLetter(Number.POSITIVE_INFINITY)).toBe("")
  })
})

describe("isCorrect", () => {
  it("is true only when the pick is the answer", () => {
    expect(isCorrect(q(1), 1)).toBe(true)
    expect(isCorrect(q(1), 0)).toBe(false)
  })

  it("is never true for an unanswered pick, even when the answer is 0", () => {
    expect(isCorrect(q(0), null)).toBe(false)
  })
})

describe("tally", () => {
  const questions = [q(0), q(1), q(2)]

  it("counts a partial set", () => {
    expect(tally(questions, [0, null, 0])).toEqual({
      total: 3,
      answered: 2,
      correct: 1,
      complete: false,
    })
  })

  it("is complete once every question has a pick, right or wrong", () => {
    expect(tally(questions, [0, 1, 2])).toEqual({
      total: 3,
      answered: 3,
      correct: 3,
      complete: true,
    })
    expect(tally(questions, [1, 2, 0])).toEqual({
      total: 3,
      answered: 3,
      correct: 0,
      complete: true,
    })
  })

  it("counts a pick of 0 as answered", () => {
    expect(tally([q(1)], [0])).toMatchObject({ answered: 1, correct: 0 })
  })

  it("never calls an empty quiz complete", () => {
    expect(tally([], [])).toEqual({
      total: 0,
      answered: 0,
      correct: 0,
      complete: false,
    })
  })

  it("treats missing picks as unanswered and ignores extra picks", () => {
    expect(tally(questions, [0])).toMatchObject({
      answered: 1,
      complete: false,
    })
    expect(tally(questions, [])).toMatchObject({ answered: 0 })
    expect(tally(questions, [0, 1, 2, 2, 2])).toMatchObject({
      total: 3,
      answered: 3,
      correct: 3,
    })
  })

  it("does not change its inputs", () => {
    const picks = [0, null, 2]
    tally(questions, picks)
    expect(picks).toEqual([0, null, 2])
  })
})

describe("emptyPicks", () => {
  it("returns one null per question", () => {
    expect(emptyPicks([q(0), q(1)])).toEqual([null, null])
    expect(emptyPicks([])).toEqual([])
  })

  it("returns a fresh array each time", () => {
    const questions = [q(0)]
    expect(emptyPicks(questions)).not.toBe(emptyPicks(questions))
  })
})

describe("checkQuestions", () => {
  it("returns [] for a clean set", () => {
    expect(
      checkQuestions([
        q(0, ["a", "b"]),
        q(2, ["x", "y", "z"]),
        q(1, [{ label: "one" }, { label: "one" }]),
      ])
    ).toEqual([])
    expect(checkQuestions([])).toEqual([])
  })

  it("flags fewer than two options", () => {
    expect(checkQuestions([q(0, ["only"])])).toEqual([
      "Question 1: needs at least two options",
    ])
    expect(checkQuestions([q(0, [])])).toContain(
      "Question 1: needs at least two options"
    )
  })

  it("flags an answer that is not an option", () => {
    expect(checkQuestions([q(3)])).toEqual([
      "Question 1: answer 3 is not an option",
    ])
    expect(checkQuestions([q(-1)])).toEqual([
      "Question 1: answer -1 is not an option",
    ])
  })

  it("flags a non-integer answer", () => {
    expect(checkQuestions([q(1.5)])).toEqual([
      "Question 1: answer 1.5 is not an option",
    ])
    expect(checkQuestions([q(Number.NaN)])).toHaveLength(1)
  })

  it("flags duplicate string labels, ignoring case and outer spaces", () => {
    expect(checkQuestions([q(0, ["Mizu", "hi", " mizu "])])).toEqual([
      'Question 1: " mizu " appears twice, so two options are right',
    ])
  })

  it("names the question by its 1-based position", () => {
    const problems = checkQuestions([q(0), q(9), q(0, ["a", "A"])])
    expect(problems).toEqual([
      "Question 2: answer 9 is not an option",
      'Question 3: "A" appears twice, so two options are right',
    ])
  })

  it("reports every problem in one question", () => {
    expect(checkQuestions([q(5, ["a", "a"])])).toHaveLength(2)
  })
})
