"use client"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface NumberPadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  onClose?: () => void
  validateOnChange?: boolean
}

export function NumberPad({ value, onChange, maxLength = 4, onClose, validateOnChange = false }: NumberPadProps) {
  const handlePress = (digit: string) => {
    if (value.length < maxLength) {
      const newValue = value + digit

      // Only validate on change if explicitly requested
      if (validateOnChange && !/^\d+$/.test(newValue)) {
        return
      }

      onChange(newValue)
    }
  }

  const handleBackspace = () => {
    onChange(value.slice(0, -1))
  }

  const handleClear = () => {
    onChange("")
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <Button
            key={digit}
            type="button"
            variant="outline"
            className="h-14 text-xl font-medium bg-[#000033] border-[#00FFFF] text-[#00FFFF] hover:bg-[#000055]"
            onClick={() => handlePress(digit.toString())}
          >
            {digit}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-14 text-xl font-medium bg-[#000033] border-[#00FFFF] text-[#00FFFF] hover:bg-[#000055]"
          onClick={handleClear}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-14 text-xl font-medium bg-[#000033] border-[#00FFFF] text-[#00FFFF] hover:bg-[#000055]"
          onClick={() => handlePress("0")}
        >
          0
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-14 text-xl font-medium bg-[#000033] border-[#00FFFF] text-[#00FFFF] hover:bg-[#000055]"
          onClick={handleBackspace}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
      {onClose && (
        <Button type="button" variant="ghost" className="w-full text-[#00FFFF] hover:bg-[#000055]" onClick={onClose}>
          Done
        </Button>
      )}
    </div>
  )
}
