import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { hapticFeedback } from "../utils/haptic-feedback"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export hapticFeedback
export { hapticFeedback }
