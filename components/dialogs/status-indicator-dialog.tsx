"use client"

import type { Table } from "@/components/system/billiards-timer-dashboard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Beer, Utensils, Bell, SprayCan } from "lucide-react"

interface StatusIndicatorDialogProps {
  open: boolean
  onClose: () => void
  table: Table | null
  onUpdateStatus: (tableId: number, statuses: string[]) => void
}

const statusOptions = [
  { key: "service", icon: Bell, label: "Server" },
  { key: "drinks", icon: Beer, label: "Drinks" },
  { key: "food", icon: Utensils, label: "Food" },
  { key: "clean", icon: SprayCan, label: "Clean" },
]

export function StatusIndicatorDialog({ open, onClose, table, onUpdateStatus }: StatusIndicatorDialogProps) {
  const current = table?.statusIndicators || []

  const toggle = (key: string) => {
    if (!table) return
    const exists = current.includes(key)
    const updated = exists ? current.filter((s) => s !== key) : [...current, key]
    onUpdateStatus(table.id, updated)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[300px] bg-black text-white border-[#00FFFF] space-theme font-mono">
        <DialogHeader>
          <DialogTitle className="text-lg text-[#00FFFF]">Status: {table?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2 text-sm">
          {statusOptions.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={current.includes(key) ? "default" : "outline"}
              onClick={() => toggle(key)}
              className="flex items-center gap-1 px-2 py-1 text-xs"
            >
              <Icon className="h-4 w-4" /> {label}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] w-full">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
