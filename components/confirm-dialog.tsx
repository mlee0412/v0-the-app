"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  message: string
}

export function ConfirmDialog({ open, onClose, onConfirm, message }: ConfirmDialogProps) {
  // Create a separate handler for confirmation to ensure dialog closes properly
  const handleConfirm = () => {
    // First close the dialog
    onClose()
    // Then perform the action with a slight delay to ensure UI updates properly
    setTimeout(() => {
      onConfirm()
    }, 50)
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent
        className="bg-black border-[#00FFFF] text-white font-mono"
        style={{
          backgroundImage: "linear-gradient(to bottom, #000033, #000011)",
          backgroundSize: "cover",
          boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#00FFFF]" style={{ textShadow: "0 0 5px rgba(0, 255, 255, 0.7)" }}>
            Confirm Action
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
            style={{ textShadow: "0 0 5px rgba(0, 255, 255, 0.7)" }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-[#FF0000] hover:bg-[#CC0000] text-white"
            style={{ textShadow: "0 0 5px rgba(255, 0, 0, 0.7)" }}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
