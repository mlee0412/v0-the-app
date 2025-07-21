"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { NumberPad } from "@/components/auth/number-pad"
import {
  PlusIcon,
  MinusIcon,
} from "lucide-react"
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
  const [showNumberPad, setShowNumberPad] = useState(false)
  const [numberPadValue, setNumberPadValue] = useState("")
  const touchInProgressRef = useRef(false)

  useEffect(() => {
    if (open) {
      setGuestCount(0)
      setServerId("")
      setShowNumberPad(false)
      setNumberPadValue("0")
    }
  }, [open])

  useEffect(() => {
    if (showNumberPad) {
      setNumberPadValue(String(guestCount))
    }
  }, [showNumberPad, guestCount])

  const handleIncrement = () => {
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true
    setTimeout(() => {
      touchInProgressRef.current = false
    }, 300)
    setGuestCount((c) => Math.min(16, c + 1))
  }

  const handleDecrement = () => {
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true
    setTimeout(() => {
      touchInProgressRef.current = false
    }, 300)
    setGuestCount((c) => Math.max(0, c - 1))
  }

  const handleGuestCountClick = () => {
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true
    setTimeout(() => {
      touchInProgressRef.current = false
    }, 300)
    setShowNumberPad(true)
  }

  const handleNumberPadDone = () => {
    const num = Math.min(16, Math.max(0, parseInt(numberPadValue, 10) || 0))
    setGuestCount(num)
    setShowNumberPad(false)
  }

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
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] active:scale-95"
                onClick={handleDecrement}
              >
                <MinusIcon className="h-5 w-5" />
              </Button>
              <div
                className="text-2xl font-bold w-16 h-10 flex items-center justify-center bg-[#110022] border-2 border-[#FF00FF] rounded-md cursor-pointer relative active:scale-95"
                onClick={handleGuestCountClick}
              >
                {guestCount}
                <span className="absolute bottom-0.5 right-1 text-[8px] text-[#FF00FF] opacity-70">tap</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] active:scale-95"
                onClick={handleIncrement}
              >
                <PlusIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {showNumberPad && (
            <Dialog open={showNumberPad} onOpenChange={setShowNumberPad}>
              <DialogContent className="bg-black border-[#00FFFF] text-white space-theme font-mono">
                <DialogHeader>
                  <DialogTitle className="text-xl text-[#00FFFF]">Enter Guest Count</DialogTitle>
                </DialogHeader>
                <NumberPad
                  value={numberPadValue}
                  onChange={setNumberPadValue}
                  maxLength={2}
                />
                <DialogFooter className="pt-2">
                  <Button
                    variant="outline"
                    onClick={handleNumberPadDone}
                    className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
                  >
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <div className="space-y-2">
            <label className="text-sm text-[#00FF00]">Server</label>
            <div className="grid grid-cols-3 gap-2">
              {servers.map((s) => (
                <Button
                  key={s.id}
                  variant={serverId === s.id ? "default" : "outline"}
                  className={
                    serverId === s.id
                      ? "w-full bg-[#00FF00] hover:bg-[#00CC00] text-black active:scale-95"
                      : "w-full border-2 border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-white active:scale-95"
                  }
                  onClick={() => setServerId(s.id)}
                >
                  {s.name}
                </Button>
              ))}
            </div>
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
