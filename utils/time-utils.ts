export function formatTime(ms: number, showHours = true): string {
  // Handle negative time for overtime
  const isNegative = ms < 0
  const absoluteMs = Math.abs(ms)

  const totalSeconds = Math.floor(absoluteMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (showHours) {
    return `${isNegative ? "-" : ""}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return `${isNegative ? "-" : ""}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function formatElapsedTime(startTime: string | null): string {
  if (!startTime) return "0:00"

  const elapsed = Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000)
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function formatHHMMSS(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}
