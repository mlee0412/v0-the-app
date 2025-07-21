"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Table } from "@/components/system/billiards-timer-dashboard"

interface QuickNoteDialogProps {
  open: boolean
  onClose: () => void
  table: Table | null
  onSave: (tableId: number, noteText: string) => void
}

export function QuickNoteDialog({ open, onClose, table, onSave }: QuickNoteDialogProps) {
  const [note, setNote] = useState("")

  useEffect(() => {
    if (open) {
      setNote(table?.noteText || "")
    }
  }, [open, table])

  const handleSave = () => {
    if (table) {
      onSave(table.id, note)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[400px] bg-black text-white border-[#00FFFF] space-theme font-mono">
        <DialogHeader>
          <DialogTitle className="text-lg text-[#00FFFF]">Quick Note: {table?.name}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="bg-[#000033] border-[#00FFFF] text-white" />
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]">Cancel</Button>
          <Button onClick={handleSave} className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
