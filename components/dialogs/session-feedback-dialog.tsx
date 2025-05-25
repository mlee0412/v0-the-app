"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react"
import type { Table } from "@/components/system/billiards-timer-dashboard"

interface SessionFeedbackDialogProps {
  open: boolean
  onClose: () => void
  table: Table
  onSubmitFeedback: (tableId: number, rating: "good" | "bad", comment: string) => void
}

export function SessionFeedbackDialog({ open, onClose, table, onSubmitFeedback }: SessionFeedbackDialogProps) {
  const [rating, setRating] = useState<"good" | "bad" | null>(null)
  const [comment, setComment] = useState("")

  const handleSubmit = () => {
    if (rating) {
      onSubmitFeedback(table.id, rating, comment)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[450px] bg-black text-white border-[#00FFFF] space-theme font-mono"
        style={{
          backgroundImage: "linear-gradient(to bottom, #000033, #000011)",
          backgroundSize: "cover",
          boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg text-[#00FFFF] flex items-center gap-2">
            Session Feedback: {table.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-center">
            <p className="text-sm text-gray-300 mb-3">How was this session?</p>
            <div className="flex justify-center gap-4">
              <Button
                variant={rating === "good" ? "default" : "outline"}
                className={`flex flex-col items-center p-4 h-auto ${
                  rating === "good"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "border-green-600 text-green-400 hover:bg-green-900/20"
                }`}
                onClick={() => setRating("good")}
              >
                <ThumbsUp className="h-8 w-8 mb-2" />
                <span>Good</span>
              </Button>

              <Button
                variant={rating === "bad" ? "default" : "outline"}
                className={`flex flex-col items-center p-4 h-auto ${
                  rating === "bad"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "border-red-600 text-red-400 hover:bg-red-900/20"
                }`}
                onClick={() => setRating("bad")}
              >
                <ThumbsDown className="h-8 w-8 mb-2" />
                <span>Bad</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MessageSquare className="h-4 w-4 text-[#00FFFF]" />
              <span>Additional comments (optional):</span>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter any additional feedback..."
              className="resize-none h-20 bg-[#000033] border-[#00FFFF] text-white"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
          >
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={!rating} className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black">
            Submit & End Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
