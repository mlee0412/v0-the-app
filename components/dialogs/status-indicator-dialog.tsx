"use client"

import type { Table } from "@/components/system/billiards-timer-dashboard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface StatusIndicatorDialogProps {
  open: boolean
  onClose: () => void
  table: Table | null
}

export function StatusIndicatorDialog({ open, onClose, table }: StatusIndicatorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[300px] bg-black text-white border-[#00FFFF] space-theme font-mono">
        <DialogHeader>
          <DialogTitle className="text-lg text-[#00FFFF]">Status: {table?.name}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-1 text-sm">
          <div>Active: {table?.isActive ? "Yes" : "No"}</div>
          <div>Guest Count: {table?.guestCount}</div>
          <div>Server: {table?.server || "None"}</div>
          {table?.groupId && <div>Group: {table.groupId}</div>}
          {table?.hasNotes && <div>Note: {table.noteText}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] w-full">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
