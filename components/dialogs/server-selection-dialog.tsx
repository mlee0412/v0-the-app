"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ServerIcon, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { NeonGlow } from "@/components/neon-glow"
import { SpaceButton } from "@/components/space-button"
import type { Server } from "@/components/system/billiards-timer-dashboard"

interface ServerSelectionDialogProps {
  open: boolean
  onClose: () => void
  servers: Server[]
  onUpdateServers: (servers: Server[]) => void
}

export function ServerSelectionDialog({ open, onClose, servers, onUpdateServers }: ServerSelectionDialogProps) {
  const [selectedServers, setSelectedServers] = useState<Server[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize selected servers when dialog opens
  useEffect(() => {
    if (open) {
      // Make sure we're working with unique servers by using a Map with server IDs as keys
      const uniqueServers = new Map()

      servers.forEach((server) => {
        if (!uniqueServers.has(server.id)) {
          uniqueServers.set(server.id, {
            ...server,
            enabled: false, // Set all servers to disabled by default
          })
        }
      })

      // Convert the Map values back to an array
      setSelectedServers(Array.from(uniqueServers.values()))

      // Clear any previous validation error
      setValidationError(null)
      setError(null)
    }
  }, [open, servers])

  // Toggle server selection
  const toggleServer = (serverId: string) => {
    setSelectedServers((prev) =>
      prev.map((server) => (server.id === serverId ? { ...server, enabled: !server.enabled } : server)),
    )
    // Clear any error when user makes a selection
    setError(null)
  }

  // Handle save
  const handleSave = () => {
    // Check if at least 2 servers are enabled
    const enabledServers = selectedServers.filter((server) => server.enabled)

    if (enabledServers.length < 2) {
      setError("Please select at least 2 servers to start the day")
      return
    }

    // Update servers with enabled/disabled status
    onUpdateServers(selectedServers)
    onClose()
  }

  // Update the onUpdateServers function to prevent duplicates
  const handleUpdateServers = () => {
    // Filter out any potential duplicates before updating
    const uniqueServers = selectedServers.reduce((acc, server) => {
      // Only add if not already in the accumulator by name
      if (!acc.some((s) => s.name.toLowerCase() === server.name.toLowerCase())) {
        acc.push(server)
      }
      return acc
    }, [] as Server[])

    onUpdateServers(uniqueServers)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[500px] bg-black text-white border-[#00FFFF] space-theme font-mono"
        style={{
          backgroundImage: "linear-gradient(to bottom, #000033, #000011)",
          boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-[#00FFFF] flex items-center gap-2">
            <ServerIcon className="h-5 w-5 text-[#00FF00]" />
            <NeonGlow color="cyan" intensity="high">
              <span>Select Available Servers</span>
            </NeonGlow>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-gray-300 mb-4">
            Select the servers who are working today. Only enabled servers will be available for table assignments.
          </p>

          {selectedServers.length === 0 ? (
            <div className="flex items-center justify-center p-4 bg-[#330000] border border-[#FF0000] rounded-md">
              <AlertTriangle className="h-5 w-5 text-[#FF0000] mr-2" />
              <span className="text-[#FF0000]">No servers found. Please add servers in Settings first.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {selectedServers.map((server) => (
                <div
                  key={server.id}
                  className={`flex items-center justify-between p-3 rounded-md transition-all duration-300 ${
                    server.enabled
                      ? "bg-[#001100] border-2 border-[#00FF00]"
                      : "bg-[#110011] border border-[#FF00FF] opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {server.enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00FF00]" />
                    ) : (
                      <XCircle className="h-5 w-5 text-[#FF00FF]" />
                    )}
                    <span className="font-medium">{server.name}</span>
                  </div>
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={() => toggleServer(server.id)}
                    className={`scale-110 ${
                      server.enabled ? "data-[state=checked]:bg-[#00FF00]" : "data-[state=unchecked]:bg-[#FF00FF]"
                    }`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-[#330000] border border-[#FF0000] rounded-md p-3 text-[#FF0000] text-sm mt-2">{error}</div>
        )}

        <DialogFooter className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
          >
            Cancel
          </Button>
          <SpaceButton
            onClick={handleUpdateServers}
            glowColor="rgba(0, 255, 255, 0.5)"
            className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black"
            disabled={selectedServers.length === 0}
          >
            Confirm Selection
          </SpaceButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
