"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SkipBackIcon as Backspace, Check, X } from "lucide-react"
import { NeonGlow } from "@/components/neon-glow"

interface NumberPadProps {
  open: boolean
  onClose: () => void
  onSubmit: (value: number) => void
  initialValue?: number
  maxValue?: number
  minValue?: number
  title?: string
}

export function NumberPad({
  open,
  onClose,
  onSubmit,
  initialValue = 0,
  maxValue = 99,
  minValue = 0,
  title = "Enter Number",
}: NumberPadProps) {
  const [value, setValue] = useState(initialValue.toString())

  // Reset value when dialog opens with initialValue
  useEffect(() => {
    if (open) {
      setValue(initialValue.toString())
    }
  }, [open, initialValue])

  const handleNumberClick = (num: number) => {
    // If current value is 0, replace it, otherwise append
    if (value === "0") {
      setValue(num.toString())
    } else {
      // Check if adding this digit would exceed maxValue
      const newValue = value + num.toString()
      if (Number(newValue) <= maxValue) {
        setValue(newValue)
      }
    }
  }

  const handleClear = () => {
    setValue("0")
  }

  const handleBackspace = () => {
    if (value.length > 1) {
      setValue(value.slice(0, -1))
    } else {
      setValue("0")
    }
  }

  const handleSubmit = () => {
    const numValue = Number(value)
    if (numValue >= minValue && numValue <= maxValue) {
      onSubmit(numValue)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[300px] bg-black text-white border-[#FF00FF] space-theme font-mono"
        style={{
          backgroundImage: "linear-gradient(to bottom, #330033, #110011)",
          boxShadow: "0 0 20px rgba(255, 0, 255, 0.5)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg text-[#FF00FF] flex items-center justify-between">
            <NeonGlow color="magenta" intensity="medium">
              <span>{title}</span>
            </NeonGlow>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Display */}
          <div
            className="bg-[#000033] border-2 border-[#FF00FF] rounded-md p-4 text-center mb-2 shadow-inner"
            style={{ boxShadow: "inset 0 0 15px rgba(255, 0, 255, 0.3)" }}
          >
            <NeonGlow color="magenta" intensity="high">
              <span className="text-4xl font-bold">{value}</span>
            </NeonGlow>
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-14 border-2 border-[#FF00FF] bg-[#330033] hover:bg-[#550055] text-[#FF00FF] text-2xl font-bold shadow-md active:scale-95 transition-transform"
                onClick={() => handleNumberClick(num)}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-14 border-2 border-[#FF0000] bg-[#330000] hover:bg-[#550000] text-[#FF0000] shadow-md active:scale-95 transition-transform"
              onClick={handleClear}
            >
              <X className="h-6 w-6" />
            </Button>
            <Button
              variant="outline"
              className="h-14 border-2 border-[#FF00FF] bg-[#330033] hover:bg-[#550055] text-[#FF00FF] text-2xl font-bold shadow-md active:scale-95 transition-transform"
              onClick={() => handleNumberClick(0)}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-14 border-2 border-[#FFFF00] bg-[#333300] hover:bg-[#555500] text-[#FFFF00] shadow-md active:scale-95 transition-transform"
              onClick={handleBackspace}
            >
              <Backspace className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#FF00FF] bg-[#330033] hover:bg-[#550055] text-[#FF00FF]"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-[#FF00FF] hover:bg-[#CC00CC] text-white">
            <Check className="h-4 w-4 mr-1" />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
