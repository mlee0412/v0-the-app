"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SkipBackIcon as Backspace, XCircle } from "lucide-react"

interface NumberPadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  onClose?: () => void
}

export function NumberPad({ value, onChange, maxLength = 4, onClose }: NumberPadProps) {
  const [currentValue, setCurrentValue] = useState(value)

  useEffect(() => {
    setCurrentValue(value)
  }, [value])

  const handleKeyPress = (key: string) => {
    if (key === "clear") {
      setCurrentValue("")
      onChange("")
    } else if (key === "backspace") {
      const newValue = currentValue.slice(0, -1)
      setCurrentValue(newValue)
      onChange(newValue)
    } else {
      // Only allow digits up to maxLength
      if (currentValue.length < maxLength) {
        const newValue = currentValue + key
        setCurrentValue(newValue)
        onChange(newValue)
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            variant="outline"
            className="h-12 w-full border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] text-xl font-bold"
            onClick={() => handleKeyPress(num.toString())}
          >
            {num}
          </Button>
        ))}
        <Button
          variant="outline"
          className="h-12 w-full border-red-800 bg-[#000033] hover:bg-[#000066] text-red-400"
          onClick={() => handleKeyPress("clear")}
        >
          <XCircle className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] text-xl font-bold"
          onClick={() => handleKeyPress("0")}
        >
          0
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full border-yellow-800 bg-[#000033] hover:bg-[#000066] text-yellow-400"
          onClick={() => handleKeyPress("backspace")}
        >
          <Backspace className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
