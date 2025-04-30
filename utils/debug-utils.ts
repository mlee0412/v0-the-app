// Debug utility functions

// Log with timestamp
export const logWithTime = (message: string, data?: any) => {
  const timestamp = new Date().toISOString()
  if (data) {
    console.log(`[${timestamp}] ${message}`, data)
  } else {
    console.log(`[${timestamp}] ${message}`)
  }
}

// Check if two objects are different
export const isDifferent = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return false
  if (typeof obj1 !== typeof obj2) return true
  if (typeof obj1 !== "object" || obj1 === null || obj2 === null) return true

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return true

  for (const key of keys1) {
    if (!keys2.includes(key)) return true
    if (isDifferent(obj1[key], obj2[key])) return true
  }

  return false
}

// Compare two arrays of objects and log differences
export const compareArrays = <T extends { id: string | number }>(arr1: T[], arr2: T[], name: string): void => {
  if (arr1.length !== arr2.length) {
    logWithTime(`${name} arrays have different lengths: ${arr1.length} vs ${arr2.length}`)
    return
  }

  // Create maps for faster lookup
  const map1 = new Map(arr1.map((item) => [item.id, item]))
  const map2 = new Map(arr2.map((item) => [item.id, item]))

  // Check for items in arr1 that are different in arr2
  for (const [id, item1] of map1.entries()) {
    const item2 = map2.get(id)
    if (!item2) {
      logWithTime(`${name} item with id ${id} exists in first array but not in second`)
      continue
    }

    if (isDifferent(item1, item2)) {
      logWithTime(`${name} item with id ${id} is different:`, {
        first: item1,
        second: item2,
      })
    }
  }

  // Check for items in arr2 that don't exist in arr1
  for (const id of map2.keys()) {
    if (!map1.has(id)) {
      logWithTime(`${name} item with id ${id} exists in second array but not in first`)
    }
  }
}
