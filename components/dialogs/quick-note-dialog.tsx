"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Table, NoteTemplate } from "@/components/system/billiards-timer-dashboard"
import { statusOptions } from "./status-indicator-dialog"

interface QuickNoteDialogProps {
  open: boolean
  onClose: () => void
  table: Table | null
  noteTemplates: NoteTemplate[]
  onSave: (tableId: number, noteText: string) => void
  onUpdateStatus: (tableId: number, statuses: string[]) => void
}

export function QuickNoteDialog({ open, onClose, table, noteTemplates, onSave, onUpdateStatus }: QuickNoteDialogProps) {
  const [note, setNote] = useState("")
  const [selectedNoteId, setSelectedNoteId] = useState<string>("")
  const [statuses, setStatuses] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setNote(table?.noteText || "")
      setSelectedNoteId(table?.noteId || "")
      setStatuses(table?.statusIndicators || [])
    }
  }, [open, table])

  const handleSave = () => {
    if (table) {
      onSave(table.id, note)
      onClose()
    }
  }

  const handleTemplateSelect = (id: string) => {
    setSelectedNoteId(id)
    const template = noteTemplates.find((t) => t.id === id)
    setNote(template?.text || "")
  }

  const toggleStatus = (key: string) => {
    if (!table) return
    const exists = statuses.includes(key)
    const updated = exists ? statuses.filter((s) => s !== key) : [...statuses, key]
    setStatuses(updated)
    onUpdateStatus(table.id, updated)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[400px] bg-black text-white border-[#00FFFF] space-theme font-mono">
        <DialogHeader>
          <DialogTitle className="text-lg text-[#00FFFF]">Quick Note: {table?.name}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          {noteTemplates.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedNoteId === "" ? "default" : "outline"}
                className={selectedNoteId === "" ? "w-full bg-[#FFFF00] text-black active:scale-95" : "w-full border-[#FFFF00] text-[#FFFF00] active:scale-95"}
                onClick={() => handleTemplateSelect("")}
              >
                No Note
              </Button>
              {noteTemplates.map((note) => (
                <Button
                  key={note.id}
                  variant={selectedNoteId === note.id ? "default" : "outline"}
                  className={selectedNoteId === note.id ? "w-full bg-[#FFFF00] text-black active:scale-95" : "w-full border-[#FFFF00] text-[#FFFF00] active:scale-95"}
                  onClick={() => handleTemplateSelect(note.id)}
                >
                  {note.text.length > 15 ? note.text.substring(0, 15) + "..." : note.text}
                </Button>
              ))}
            </div>
          )}
          {selectedNoteId && (
            <div className="p-2 bg-[#111100] rounded-md border border-[#FFFF00]/50">
              <p className="text-[#FFFF00]">
                {noteTemplates.find((n) => n.id === selectedNoteId)?.text || ""}
              </p>
            </div>
          )}
          {table && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              {statusOptions.map(({ key, icon: Icon, label }) => (
                <Button
                  key={key}
                  variant={statuses.includes(key) ? "default" : "outline"}
                  onClick={() => toggleStatus(key)}
                  className="flex items-center gap-1 px-2 py-1 text-xs"
                >
                  <Icon className="h-4 w-4" /> {label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]">Cancel</Button>
          <Button onClick={handleSave} className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
