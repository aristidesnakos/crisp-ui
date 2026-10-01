"use client"

import { CalibrationDesk } from "@/registry/crisp/blocks/calibration-desk"

// Fictional gauges, people and roles. The server behind it is an in-memory
// stand-in (registry/crisp/lib/calibration-desk-server.ts): nothing is saved
// and nothing is sent. Pass your own `server` to make it real.
export default function CalibrationDeskDemo() {
  return <CalibrationDesk className="max-w-4xl" />
}
