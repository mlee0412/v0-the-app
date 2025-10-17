"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Table {
  id: number
  name: string
  isActive: boolean
  startTime: number | null
  pausedElapsed: number
  guestCount: number
  server: string | null
  groupId: string | null
}

interface TableGroupDialogProps {
  selectedTables: Table[]
  onClose: () => void
  onCreateGroup: (groupId: string) => void
}

export function TableGroupDialog({ selectedTables, onClose, onCreateGroup }: TableGroupDialogProps) {
  const [groupId, setGroupId] = useState("")

  const trimmedGroupId = useMemo(() => groupId.trim(), [groupId])
  const canSubmit = trimmedGroupId.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (canSubmit) {
      onCreateGroup(trimmedGroupId)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 border border-white/10 shadow-[0_0_30px_rgba(137,84,255,0.35)]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-lg font-semibold text-fuchsia-300">
            <span>Create Table Group</span>
            <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              {selectedTables.length} table{selectedTables.length === 1 ? "" : "s"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-id" className="text-slate-300">
                Group Name/ID
              </Label>
              <Input
                id="group-id"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                placeholder="Enter a group name or ID"
                className="h-10 rounded-lg border border-white/10 bg-slate-900/80 text-slate-100 placeholder:text-slate-400 focus:border-fuchsia-400/60 focus:ring-0"
              />
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
              <Label className="text-slate-300">Selected Tables</Label>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {selectedTables.map((table) => (
                  <li key={table.id} className="flex items-center justify-between rounded-md bg-slate-950/60 px-3 py-2">
                    <span>{table.name}</span>
                    {table.isActive && <span className="text-xs uppercase tracking-wide text-emerald-300">Active</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/10 bg-slate-900/70 text-slate-200 hover:border-fuchsia-400/40 hover:text-white">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-gradient-to-r from-fuchsia-500/80 to-purple-500/80 text-white shadow-lg shadow-fuchsia-500/30 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50"
            >
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
