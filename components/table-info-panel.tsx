"use client"

import type { Table } from "@/types/table"
import { formatUUID } from "@/utils/format-utils"

interface TableInfoPanelProps {
  table: Table
}

export function TableInfoPanel({ table }: TableInfoPanelProps) {
  return (
    <div className="bg-black border border-blue-900 rounded-md p-4 text-white font-mono text-sm">
      <div className="space-y-1">
        <div>Guest Count: {table.guestCount}</div>
        <div>Server: {table.serverName || "None"}</div>
        <div>Server ID: {formatUUID(table.serverId)}</div>
        <div>Active: {table.isActive ? "Yes" : "No"}</div>
      </div>
    </div>
  )
}
