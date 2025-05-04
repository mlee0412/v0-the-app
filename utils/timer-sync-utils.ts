/**
 * Utility functions for timer synchronization
 */

// Broadcast a timer update to all components
export function broadcastTimerUpdate(tableId: number, remainingTime: number, initialTime: number) {
  window.dispatchEvent(
    new CustomEvent("timer-update", {
      detail: {
        tableId,
        remainingTime,
        initialTime,
      },
    }),
  )
}

// Broadcast a table update to all components
export function broadcastTableUpdate(tableId: number, table: any) {
  window.dispatchEvent(
    new CustomEvent("table-updated", {
      detail: {
        tableId,
        table,
      },
    }),
  )
}

// Calculate remaining time based on start time and initial time
// Allow negative values for overtime
export function calculateRemainingTime(
  timerMinutes: number,
  startTime: string | null,
  isPaused: boolean,
  pauseTime: string | null,
  accumulatedTime: number,
): number {
  if (!startTime) return timerMinutes * 60 // Not started yet

  const totalSeconds = timerMinutes * 60

  // Cache these values to avoid repeated calculations
  const startTimeMs = new Date(startTime).getTime()
  const now = Date.now()

  let elapsedSeconds = 0

  if (isPaused && pauseTime) {
    const pauseTimeMs = new Date(pauseTime).getTime()
    elapsedSeconds = (pauseTimeMs - startTimeMs) / 1000
  } else {
    elapsedSeconds = (now - startTimeMs) / 1000
  }

  // Add accumulated time (from previous sessions)
  elapsedSeconds += accumulatedTime

  // Allow negative values (remove Math.max)
  return totalSeconds - elapsedSeconds
}

// Add more efficient throttling for timer updates

// Add a new throttled broadcast function

// Throttled version of broadcastTimerUpdate to prevent too many updates
let lastTimerUpdateTime = 0
const TIMER_UPDATE_THROTTLE = 250 // Reduced from 500ms to 250ms for better responsiveness

export function throttledBroadcastTimerUpdate(tableId: number, remainingTime: number, initialTime: number) {
  const now = Date.now()
  if (now - lastTimerUpdateTime < TIMER_UPDATE_THROTTLE) return

  lastTimerUpdateTime = now
  broadcastTimerUpdate(tableId, remainingTime, initialTime)
}

// Optimize the formatTime function for better performance
// Replace the formatTime function with this optimized version:

// Format time as HH:MM:SS with support for negative values - optimized
export function formatTime(ms: number) {
  // Handle negative time for overtime
  const isNegative = ms < 0
  const absoluteMs = Math.abs(ms)

  // Pre-calculate total seconds to avoid repeated division
  const totalSeconds = Math.floor(absoluteMs / 1000)

  // Use division and modulo only once for each unit
  const hours = Math.floor(totalSeconds / 3600)
  const remainderAfterHours = totalSeconds % 3600
  const minutes = Math.floor(remainderAfterHours / 60)
  const seconds = remainderAfterHours % 60

  // Use template literals for faster string concatenation
  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  // Add negative sign for overtime (using proper minus sign)
  return isNegative ? `−${formattedTime}` : formattedTime
}

// Format time as MM:SS with support for negative values
export function formatShortTime(ms: number) {
  // Handle negative time for overtime
  const isNegative = ms < 0
  const absoluteMs = Math.abs(ms)

  const totalSeconds = Math.floor(absoluteMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  // Add negative sign for overtime (using proper minus sign)
  return isNegative ? `−${formattedTime}` : formattedTime
}

// Throttle function to limit how often a function can be called
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      func(...args)
    }
  }
}

// Debounce function to delay execution until after a period of inactivity
export function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Use requestAnimationFrame for smoother animations
export function animateWithRaf(callback: (timestamp: number) => void) {
  let animationFrameId: number
  let lastTimestamp = 0

  const animate = (timestamp: number) => {
    // Calculate delta time for smooth animations
    const deltaTime = timestamp - lastTimestamp
    lastTimestamp = timestamp

    // Call the callback with the timestamp
    callback(deltaTime)

    // Continue the animation loop
    animationFrameId = requestAnimationFrame(animate)
  }

  // Start the animation loop
  animationFrameId = requestAnimationFrame(animate)

  // Return a function to cancel the animation
  return () => {
    cancelAnimationFrame(animationFrameId)
  }
}

// Add a new function to calculate remaining time on-the-fly
export function calculateRemainingTimeOnTheFly(
  initialTime: number,
  startTime: string | null,
  isPaused: boolean,
  pauseTime: string | null,
  accumulatedTime: number,
  currentTime: number,
): number {
  if (!startTime) return initialTime // Not started yet

  const totalSeconds = initialTime / 1000
  const startTimeMs = new Date(startTime).getTime()

  let elapsedSeconds = 0

  if (isPaused && pauseTime) {
    const pauseTimeMs = new Date(pauseTime).getTime()
    elapsedSeconds = (pauseTimeMs - startTimeMs) / 1000
  } else {
    elapsedSeconds = (currentTime - startTimeMs) / 1000
  }

  // Add accumulated time (from previous sessions)
  elapsedSeconds += accumulatedTime

  // Allow negative values for overtime
  return (totalSeconds - elapsedSeconds) * 1000
}
