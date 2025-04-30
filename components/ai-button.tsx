"use client"

import { useState } from "react"
import { Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AiAssistantDialog } from "@/components/ai-assistant-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"
import { TooltipProvider } from "@/components/ui/tooltip"
import menuDataService from "@/services/menu-data-service"

interface AiButtonProps {
  tables: Table[]
  logs: LogEntry[]
  servers: Server[]
}

export function AiButton({ tables, logs, servers }: AiButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleClick = async () => {
    try {
      // Fetch menu data
      const menuItems = await menuDataService.getMenuItems()

      // Get recommendations for active tables
      const activeTable = tables.find((t) => t.isActive && t.guestCount > 0)
      let menuRecommendations = []

      if (activeTable) {
        const sessionDuration = activeTable.initialTime - activeTable.remainingTime
        menuRecommendations = await menuDataService.getMenuRecommendations(
          activeTable.id,
          activeTable.guestCount,
          sessionDuration,
        )
      }

      // Open the AI assistant dialog with the menu data
      setDialogOpen(true)
    } catch (error) {
      console.error("Error preparing AI assistant:", error)
      // Still open the dialog even if there's an error fetching menu data
      setDialogOpen(true)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            className="bg-[#330033] hover:bg-[#660066] text-[#FF00FF] border border-[#FF00FF] flex items-center gap-1 h-7 shadow-lg"
            style={{ boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)" }}
          >
            <Brain className="h-3 w-3" />
            <span className="hidden sm:inline text-xs">AI Assistant</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ask the AI assistant for insights</p>
        </TooltipContent>
      </Tooltip>

      <AiAssistantDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        tables={tables}
        logs={logs}
        servers={servers}
      />
    </TooltipProvider>
  )
}
