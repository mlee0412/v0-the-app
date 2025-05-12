/**
 * Utility functions for handling imports and external resources
 *
 * This file was added to fix deployment issues related to malformed imports
 */

// Safe way to import external resources
export const getExternalResource = (url: string): string => {
  // Ensure URL is properly formatted
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    console.warn("Invalid URL format:", url)
    return ""
  }

  return url
}

// For dynamic imports that might cause issues
export const safeImport = async (modulePath: string) => {
  try {
    return await import(modulePath)
  } catch (error) {
    console.error("Error importing module:", modulePath, error)
    return null
  }
}
