export function formatUUID(uuid: string | null | undefined): string {
  if (!uuid) return "None"

  // Format UUID with dashes for better readability
  // Example: 00000000-0000-0000-0000-000000000012
  return uuid
}
