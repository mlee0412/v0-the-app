"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import type { Table, Server } from "@/components/system/billiards-timer-dashboard"

interface QuickStartDialogProps {
  open: boolean
  onClose: () => void
  table: Table | null
  servers: Server[]
  onStart: (guestCount: number, serverId: string) => void
}

export function QuickStartDialog({ open, onClose, table, servers, onStart }: QuickStartDialogProps) {
  const [guestCount, setGuestCount] = useState(0)
  const [serverId, setServerId] = useState("")

  useEffect(() => {
    if (open) {
      setGuestCount(0)
      setServerId("")
    }
  }, [open])

  const canStart = guestCount > 0 && serverId !== ""

  const handleStart = () => {
    if (table && canStart) {
      onStart(guestCount, serverId)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[400px] bg-black text-white border-[#00FFFF] space-theme font-mono">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#00FFFF]">Quick Start: {table?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm text-[#FF00FF]">Guest Count</label>
            <Input
              type="number"
              min={1}
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
              className="bg-[#000033] border-[#00FFFF] text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#00FF00]">Server</label>
            <Select value={serverId} onValueChange={setServerId}>
              <SelectTrigger className="w-full bg-[#000033] border-[#00FFFF] text-white">
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent className="bg-[#000033] border-[#00FFFF] text-white max-h-[200px]">
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black"
          >
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
