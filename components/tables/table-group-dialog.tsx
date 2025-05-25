"use client"

import type React from "react"

import { useState } from "react"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (groupId.trim()) {
      onCreateGroup(groupId.trim())
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Table Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-id">Group Name/ID</Label>
              <Input
                id="group-id"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                placeholder="Enter a group name or ID"
              />
            </div>

            <div>
              <Label>Selected Tables</Label>
              <ul className="mt-2 space-y-1">
                {selectedTables.map((table) => (
                  <li key={table.id} className="text-sm">
                    {table.name} {table.isActive && "(Active)"}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!groupId.trim()}>
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
