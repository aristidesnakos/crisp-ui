"use client"

import { Quiz, type QuizQuestion } from "@/registry/crisp/ui/quiz"

// Fictional questions. Nothing here is saved anywhere.
const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "水",
    promptLang: "ja",
    hint: "Which reading is right?",
    options: [
      { label: "みず", lang: "ja" },
      { label: "ひ", lang: "ja" },
      { label: "き", lang: "ja" },
      { label: "やま", lang: "ja" },
    ],
    answer: 0,
  },
  {
    prompt: "What does a smoke detector's steady green light mean?",
    options: [
      "It is powered and working",
      "The battery needs replacing",
      "It has detected smoke",
    ],
    answer: 0,
  },
  {
    prompt: "How often should a fire extinguisher be inspected?",
    hint: "Choose one.",
    options: ["Every week", "Every month", "Every year", "Only after use"],
    answer: 1,
    explanation:
      "A quick visual check each month, with a full service once a year.",
  },
]

export default function QuizDemo() {
  return (
    <div className="w-full max-w-xl">
      <Quiz questions={QUESTIONS} />
    </div>
  )
}
