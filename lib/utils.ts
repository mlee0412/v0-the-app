import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { hapticFeedback as hapticFeedbackUtil } from "../utils/haptic-feedback"

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Re-export hapticFeedback from utils/haptic-feedback.ts
 * This ensures compatibility with components importing from lib/utils
 */
export const hapticFeedback = hapticFeedbackUtil
