"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { XIcon } from "lucide-react"
import { Loader2 } from "lucide-react"

interface NumberPadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  onClose?: () => void
  showLoginButton?: boolean
  onLogin?: () => void
  isPending?: boolean
}

export function NumberPad({
  value,
  onChange,
  maxLength = 6,
  onClose,
  showLoginButton = false,
  onLogin,
  isPending = false,
}: NumberPadProps) {
  const handleNumberClick = (num: number) => {
    if (value.length < maxLength) {
      onChange(value + num)
    }
  }

  const handleClear = () => {
    onChange("")
  }

  const handleBackspace = () => {
    onChange(value.slice(0, -1))
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <Button
          key={num}
          type="button"
          variant="outline"
          className="h-16 text-2xl font-bold border-[#00FFFF] bg-[#000033] text-[#00FFFF] hover:bg-[#000066]"
          onClick={() => handleNumberClick(num)}
        >
          {num}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        className="h-16 text-2xl font-bold border-[#00FFFF] bg-[#000033] text-[#00FFFF] hover:bg-[#000066]"
        onClick={() => handleNumberClick(0)}
      >
        0
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-16 text-2xl font-bold border-[#00FFFF] bg-[#000033] text-[#00FFFF] hover:bg-[#000066]"
        onClick={handleBackspace}
      >
        <XIcon className="h-6 w-6" />
      </Button>
      <div></div>

      {showLoginButton ? (
        <Button
          type="button"
          className="col-span-3 h-16 text-2xl font-bold bg-[#00FFFF] text-black hover:bg-[#00CCCC] mt-2"
          onClick={onLogin}
          disabled={isPending}
        >
          {isPending ? (
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Login...</span>
            </div>
          ) : (
            "Login"
          )}
        </Button>
      ) : (
        <Button
          type="button"
          className="col-span-3 h-16 text-2xl font-bold bg-[#00FFFF] text-black hover:bg-[#00CCCC] mt-2"
          onClick={handleClear}
        >
          Clear
        </Button>
      )}
    </div>
  )
}

interface NumberPadDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (value: string) => void
  initialValue?: string
  maxLength?: number
  title?: string
}

export function NumberPadDialog({
  open,
  onClose,
  onSubmit,
  initialValue = "",
  maxLength = 6,
  title = "Enter Value",
}: NumberPadDialogProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (open) {
      setValue(initialValue)
    }
  }, [initialValue, open])

  const handleDone = () => {
    onSubmit(value)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[300px] bg-black text-white border-[#00FFFF] space-theme font-mono">
        <DialogHeader>
          <DialogTitle className="text-lg text-[#00FFFF]">{title}</DialogTitle>
        </DialogHeader>
        <NumberPad value={value} onChange={setValue} maxLength={maxLength} />
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={handleDone}
            className="w-full border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
