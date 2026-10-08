"use client"

import { TrainingTracker } from "@/registry/crisp/blocks/training-tracker"

// Made-up people and training. The server behind it is an in-memory stand-in
// (registry/crisp/lib/training-tracker-server.ts): nothing is saved and no
// email is delivered. Pass your own `server` to make it real.
export default function TrainingTrackerDemo() {
  return <TrainingTracker className="max-w-4xl" />
}
