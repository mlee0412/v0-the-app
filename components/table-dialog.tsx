"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { PlusIcon, MinusIcon, UsersIcon, ClockIcon, ServerIcon, ArrowDownIcon, PlayIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Table, Server, NoteTemplate, LogEntry } from "@/components/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
import type { User } from "@/services/user-service"
import { TooltipProvider } from "@/components/ui/tooltip"
import { NumberPad } from "@/components/number-pad"
import { MenuRecommendations } from "@/components/menu-recommendations"

interface TableDialogProps {
  table: Table
  servers: Server[]
  allTables: Table[]
  noteTemplates: NoteTemplate[]
  logs: LogEntry[]
  onClose: () => void
  onStartSession: (tableId: number) => void
  onEndSession: (tableId: number) => void
  onAddTime: (tableId: number, minutes: number) => void
  onSubtractTime: (tableId: number, minutes: number) => void
  onUpdateGuestCount: (tableId: number, count: number) => void
  onAssignServer: (tableId: string | null) => void
  onGroupTables: (tableIds: number[]) => void
  onUngroupTable: (tableId: number) => void
  onMoveTable: (sourceId: number, targetId: number) => void
  onUpdateNotes: (tableId: number, noteId: string, noteText: string) => void
  getServerName: (serverId: string | null) => string
  currentUser: User | null
  hasPermission: (permission: string) => boolean
  viewOnlyMode?: boolean
}

export function TableDialog({
  table,
  servers,
  allTables,
  noteTemplates,
  logs,
  onClose,
  onStartSession,
  onEndSession,
  onAddTime,
  onSubtractTime,
  onUpdateGuestCount,
  onAssignServer,
  onGroupTables,
  onUngroupTable,
  onMoveTable,
  onUpdateNotes,
  getServerName,
  currentUser,
  hasPermission,
  viewOnlyMode = false,
}: TableDialogProps) {
  const { isAdmin, isServer, isAuthenticated } = useAuth()
  const [selectedTab, setSelectedTab] = useState("manage")
  const [selectedTables, setSelectedTables] = useState<number[]>([table.id])
  const [targetTableId, setTargetTableId] = useState<number | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string>(table.noteId || "")
  const [displayedRemainingTime, setDisplayedRemainingTime] = useState(table.remainingTime)
  const [guestCount, setGuestCount] = useState(table.guestCount)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showNumberPad, setShowNumberPad] = useState(false)
  const [guestInputMethod, setGuestInputMethod] = useState<"buttons" | "numberpad">("buttons")
  const [serverSelectionExpanded, setServerSelectionExpanded] = useState(!table.isActive)
  const [showTimeConfirmation, setShowTimeConfirmation] = useState(false)
  const [pendingTimeAction, setPendingTimeAction] = useState<{ type: "add" | "subtract"; minutes: number } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [remainingTime, setRemainingTime] = useState(table.remainingTime)
  const [isClosing, setIsClosing] = useState(false)
  const elapsedTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [dialogOpen, setDialogOpen] = useState(true)
  const [editingServer, setEditingServer] = useState(!table.server)
  const [initialTimeDisplay, setInitialTimeDisplay] = useState(Math.floor(table.initialTime / 60000))

  // Refs to track last update time for throttling
  const lastGuestUpdateRef = useRef(0)
  const lastServerUpdateRef = useRef(0)
  const lastTimeUpdateRef = useRef(0)

  // Ref to track if a touch is in progress
  const touchInProgressRef = useRef(false)

  // Throttle time in ms - reduced for better responsiveness
  const THROTTLE_TIME = 200

  // Update displayed time when table time changes
  useEffect(() => {
    // Only update from table prop if we're not in the middle of a time change
    if (!pendingTimeAction) {
      setDisplayedRemainingTime(table.remainingTime)
      setRemainingTime(table.remainingTime)
      setInitialTimeDisplay(Math.floor(table.initialTime / 60000))
    }
  }, [table.remainingTime, table.initialTime, pendingTimeAction])

  // Update guest count when table guest count changes
  useEffect(() => {
    setGuestCount(table.guestCount)
  }, [table.guestCount])

  // Update selectedNoteId when table.noteId changes
  useEffect(() => {
    setSelectedNoteId(table.noteId || "")
  }, [table.noteId])

  // Clear validation error when tab changes
  useEffect(() => {
    setValidationError(null)
  }, [selectedTab])

  // Set server selection expanded state based on table active state and server selection
  useEffect(() => {
    if (table.isActive) {
      setServerSelectionExpanded(false)
    } else {
      setServerSelectionExpanded(true)
      setEditingServer(!table.server) // Start in edit mode if no server is selected
    }
  }, [table.isActive, table.server])

  // Add an event listener to handle table updates
  useEffect(() => {
    const handleTableUpdate = (event: CustomEvent) => {
      // Check if event.detail exists and has the expected structure
      if (event.detail && event.detail.tableId === table.id && event.detail.table) {
        // Use requestAnimationFrame to schedule updates outside of render cycle
        requestAnimationFrame(() => {
          const updatedTable = event.detail.table
          setRemainingTime(updatedTable.remainingTime)
          setDisplayedRemainingTime(updatedTable.remainingTime)
          setInitialTimeDisplay(Math.floor(updatedTable.initialTime / 60000))
        })
      }
    }

    // Add event listener
    window.addEventListener("table-updated", handleTableUpdate as EventListener)

    // Clean up
    return () => {
      window.removeEventListener("table-updated", handleTableUpdate as EventListener)
    }
  }, [table.id])

  // Calculate remaining time - FIXED to allow negative values
  const calculateRemainingTime = useCallback(() => {
    if (!table.isActive) return table.initialTime
    if (!table.startTime) return table.remainingTime

    const elapsed = Date.now() - table.startTime
    // REMOVED Math.max to allow negative values for overtime
    return table.initialTime - elapsed
  }, [table.isActive, table.startTime, table.initialTime, table.remainingTime])

  // Update elapsed time and remaining time for active tables
  useEffect(() => {
    // Clear any existing interval
    if (elapsedTimeIntervalRef.current) {
      clearInterval(elapsedTimeIntervalRef.current)
      elapsedTimeIntervalRef.current = null
    }

    if (table.isActive && table.startTime) {
      // Calculate initial elapsed time
      setElapsedTime(Date.now() - table.startTime)
      const newRemainingTime = calculateRemainingTime()
      setRemainingTime(newRemainingTime)
      setDisplayedRemainingTime(newRemainingTime)

      // Set up interval to update elapsed time every second
      elapsedTimeIntervalRef.current = setInterval(() => {
        if (table.startTime) {
          const newElapsedTime = Date.now() - table.startTime
          setElapsedTime(newElapsedTime)

          const newRemainingTime = calculateRemainingTime()
          setRemainingTime(newRemainingTime)
          setDisplayedRemainingTime(newRemainingTime)
        }
      }, 1000)
    } else {
      setElapsedTime(0)
      setRemainingTime(table.initialTime)
      setDisplayedRemainingTime(table.initialTime)
      setInitialTimeDisplay(Math.floor(table.initialTime / 60000))
    }

    // Clean up interval on unmount or when table becomes inactive
    return () => {
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current)
        elapsedTimeIntervalRef.current = null
      }
    }
  }, [table.isActive, table.startTime, table.initialTime, calculateRemainingTime])

  // Listen for timer-update events
  useEffect(() => {
    const handleTimerUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.tableId === table.id) {
        // Use requestAnimationFrame to schedule updates outside of render cycle
        requestAnimationFrame(() => {
          setRemainingTime(event.detail.remainingTime)
          setDisplayedRemainingTime(event.detail.remainingTime)

          // Also update the initial time display
          if (event.detail.initialTime) {
            setInitialTimeDisplay(Math.floor(event.detail.initialTime / 60000))
          }
        })
      }
    }

    window.addEventListener("timer-update", handleTimerUpdate as EventListener)

    return () => {
      window.removeEventListener("timer-update", handleTimerUpdate as EventListener)
    }
  }, [table.id])

  // Listen for table-time-update events (new unified event)
  useEffect(() => {
    const handleTableTimeUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.tableId === table.id) {
        // Only update if the event didn't come from this component
        if (event.detail.source !== "dialog") {
          // Use requestAnimationFrame to schedule updates outside of render cycle
          requestAnimationFrame(() => {
            setRemainingTime(event.detail.remainingTime)
            setDisplayedRemainingTime(event.detail.remainingTime)

            // Also update the initial time display
            if (event.detail.initialTime) {
              setInitialTimeDisplay(Math.floor(event.detail.initialTime / 60000))
            }
          })
        }
      }
    }

    window.addEventListener("table-time-update", handleTableTimeUpdate as EventListener)

    return () => {
      window.removeEventListener("table-time-update", handleTableTimeUpdate as EventListener)
    }
  }, [table.id])

  // Time increment buttons
  const timeIncrements = [5, 15, 30, 60]

  // Handle group table selection
  const toggleTableSelection = useCallback((tableId: number) => {
    setSelectedTables((prev) => (prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]))
    setValidationError(null) // Clear any validation errors when selection changes
  }, [])

  // Create group
  const handleCreateGroup = useCallback(() => {
    if (selectedTables.length < 2) {
      setValidationError("Please select at least two tables to create a group")
      return
    }

    onGroupTables(selectedTables)
    setSelectedTables([table.id]) // Reset to just the current table
    handleDialogClose()
  }, [selectedTables, onGroupTables, table.id])

  // Handle ungroup
  const handleUngroup = useCallback(() => {
    onUngroupTable(table.id)
    handleDialogClose()
  }, [onUngroupTable, table.id])

  // Handle move table
  const handleMoveTable = useCallback(() => {
    if (!targetTableId) {
      setValidationError("Please select a target table")
      return
    }

    onMoveTable(table.id, targetTableId)
    setTargetTableId(null)
    handleDialogClose()
  }, [targetTableId, onMoveTable, table.id])

  // Handle note selection with immediate save
  const handleNoteSelection = useCallback(
    (noteId: string) => {
      setSelectedNoteId(noteId)

      // Immediately save the note
      if (noteId) {
        const selectedTemplate = noteTemplates.find((t) => t.id === noteId)
        if (selectedTemplate) {
          // Update local state first
          window.dispatchEvent(
            new CustomEvent("local-table-update", {
              detail: {
                tableId: table.id,
                field: "notes",
                value: {
                  noteId,
                  noteText: selectedTemplate.text,
                  hasNotes: true,
                },
              },
            }),
          )

          // Then update via props
          onUpdateNotes(table.id, noteId, selectedTemplate.text)
        }
      } else {
        // Update local state first
        window.dispatchEvent(
          new CustomEvent("local-table-update", {
            detail: {
              tableId: table.id,
              field: "notes",
              value: {
                noteId: "",
                noteText: "",
                hasNotes: false,
              },
            },
          }),
        )

        // Then update via props
        onUpdateNotes(table.id, "", "")
      }
    },
    [noteTemplates, table.id, onUpdateNotes],
  )

  // Add a function to toggle edit mode for server selection
  const toggleServerEditMode = useCallback(() => {
    setEditingServer(!editingServer)
    // When entering edit mode, expand the server selection
    if (!editingServer) {
      setServerSelectionExpanded(true)
    }
  }, [editingServer])

  // Update the handleServerSelection function to hide other servers after selection
  const handleServerSelection = useCallback(
    (serverId: string) => {
      // Update local state first for immediate UI feedback
      window.dispatchEvent(
        new CustomEvent("local-table-update", {
          detail: {
            tableId: table.id,
            field: "server",
            value: serverId,
          },
        }),
      )

      // Exit edit mode after selection
      setEditingServer(false)
      // Hide server selection after making a choice
      setServerSelectionExpanded(false)

      // Force update the UI to reflect the selection immediately
      setValidationError(null)

      // Throttle the actual server assignment to reduce Supabase calls
      const now = Date.now()
      if (now - lastServerUpdateRef.current > THROTTLE_TIME) {
        lastServerUpdateRef.current = now
        // Call the onAssignServer prop to update the table in the parent component
        onAssignServer(table.id, serverId)
      } else {
        // Debounce the update
        setTimeout(() => {
          onAssignServer(table.id, serverId)
        }, THROTTLE_TIME)
      }
    },
    [table.id, onAssignServer, THROTTLE_TIME],
  )

  // Check if current user can manage this table
  const canManageTable = useMemo(
    () =>
      isAdmin ||
      (isServer && currentUser && (table.server === currentUser.id || !table.server)) ||
      hasPermission("canAssignServer"),
    [isAdmin, isServer, currentUser, table.server, hasPermission],
  )

  // Toggle server selection expansion
  const toggleServerSelection = useCallback(() => {
    if (table.isActive && canManageTable) {
      setServerSelectionExpanded(!serverSelectionExpanded)
    }
  }, [table.isActive, serverSelectionExpanded, canManageTable])

  // Update the handleAddTime function to show confirmation first
  const handleAddTime = useCallback(
    (minutes: number) => {
      // Prevent multiple rapid clicks
      if (touchInProgressRef.current) return
      touchInProgressRef.current = true

      // Preview the time change immediately
      const previewRemainingTime = remainingTime + minutes * 60 * 1000
      const previewInitialTime = Math.floor((table.initialTime + minutes * 60 * 1000) / 60000)

      setDisplayedRemainingTime(previewRemainingTime)
      setInitialTimeDisplay(previewInitialTime)

      setPendingTimeAction({ type: "add", minutes })
      setShowTimeConfirmation(true)

      // Reset touch flag after a short delay
      setTimeout(() => {
        touchInProgressRef.current = false
      }, 300)
    },
    [remainingTime, table.initialTime],
  )

  // Update the handleSubtractTime function to show confirmation first
  const handleSubtractTime = useCallback(
    (minutes: number) => {
      // Prevent multiple rapid clicks
      if (touchInProgressRef.current) return
      touchInProgressRef.current = true

      // Preview the time change immediately
      const previewRemainingTime = remainingTime - minutes * 60 * 1000
      const previewInitialTime = Math.floor(Math.max(0, table.initialTime - minutes * 60 * 1000) / 60000)

      setDisplayedRemainingTime(previewRemainingTime)
      setInitialTimeDisplay(previewInitialTime)

      setPendingTimeAction({ type: "subtract", minutes })
      setShowTimeConfirmation(true)

      // Reset touch flag after a short delay
      setTimeout(() => {
        touchInProgressRef.current = false
      }, 300)
    },
    [remainingTime, table.initialTime],
  )

  // Update the executeTimeChange function to properly handle time changes
  const executeTimeChange = useCallback(() => {
    if (!pendingTimeAction) return

    // Calculate new times
    let newRemainingTime, newInitialTime

    if (pendingTimeAction.type === "add") {
      newRemainingTime = remainingTime + pendingTimeAction.minutes * 60 * 1000
      newInitialTime = table.initialTime + pendingTimeAction.minutes * 60 * 1000
    } else {
      newRemainingTime = remainingTime - pendingTimeAction.minutes * 60 * 1000
      newInitialTime = Math.max(0, table.initialTime - pendingTimeAction.minutes * 60 * 1000)
    }

    // Update local state FIRST for immediate UI feedback
    setRemainingTime(newRemainingTime)
    setDisplayedRemainingTime(newRemainingTime)
    setInitialTimeDisplay(Math.floor(newInitialTime / 60000))

    // Clear the pending action and close the confirmation dialog first
    setShowTimeConfirmation(false)
    setPendingTimeAction(null)

    // Use requestAnimationFrame to schedule the event dispatches
    requestAnimationFrame(() => {
      // Dispatch event for real-time updates to all components
      window.dispatchEvent(
        new CustomEvent("table-time-update", {
          detail: {
            tableId: table.id,
            remainingTime: newRemainingTime,
            initialTime: newInitialTime,
            source: "dialog",
          },
        }),
      )

      // Schedule the second event dispatch separately
      setTimeout(() => {
        // Also dispatch the local-table-update for backward compatibility
        window.dispatchEvent(
          new CustomEvent("local-table-update", {
            detail: {
              tableId: table.id,
              field: "time",
              value: {
                remainingTime: newRemainingTime,
                initialTime: newInitialTime,
              },
            },
          }),
        )

        // Call the appropriate function to update the table in the parent component
        if (pendingTimeAction?.type === "add") {
          onAddTime(table.id, pendingTimeAction.minutes)
        } else if (pendingTimeAction?.type === "subtract") {
          onSubtractTime(table.id, pendingTimeAction.minutes)
        }
      }, 0)
    })
  }, [pendingTimeAction, remainingTime, table.id, table.initialTime, onAddTime, onSubtractTime])

  // Listen for time updates from the confirmation dialog
  useEffect(() => {
    if (showTimeConfirmation && pendingTimeAction) {
      // Pre-calculate what the new time would be
      const previewRemainingTime =
        pendingTimeAction.type === "add"
          ? remainingTime + pendingTimeAction.minutes * 60 * 1000
          : remainingTime - pendingTimeAction.minutes * 60 * 1000

      const previewInitialTime =
        pendingTimeAction.type === "add"
          ? Math.floor((table.initialTime + pendingTimeAction.minutes * 60 * 1000) / 60000)
          : Math.floor(Math.max(0, table.initialTime - minutes * 60 * 1000) / 60000)

      // Show the preview time while confirmation is open
      setDisplayedRemainingTime(previewRemainingTime)
      setInitialTimeDisplay(previewInitialTime)
    }
  }, [showTimeConfirmation, pendingTimeAction, remainingTime, table.initialTime])

  // Handle guest count increment with debounce for better touch response
  const handleIncrementGuests = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    const newCount = Math.min(16, guestCount + 1) // Limit to 16
    setGuestCount(newCount)

    // Update local state first for immediate UI feedback
    window.dispatchEvent(
      new CustomEvent("local-table-update", {
        detail: {
          tableId: table.id,
          field: "guestCount",
          value: newCount,
        },
      }),
    )

    // Call the update function directly for immediate response
    onUpdateGuestCount(table.id, newCount)

    setGuestInputMethod("buttons")
    setValidationError(null) // Clear validation error if guest count is updated

    // Reset touch flag after a short delay
    setTimeout(() => {
      touchInProgressRef.current = false
    }, 300)
  }, [guestCount, table.id, onUpdateGuestCount])

  // Handle guest count decrement with debounce for better touch response
  const handleDecrementGuests = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    const newCount = Math.max(0, guestCount - 1)
    setGuestCount(newCount)

    // Update local state first for immediate UI feedback
    window.dispatchEvent(
      new CustomEvent("local-table-update", {
        detail: {
          tableId: table.id,
          field: "guestCount",
          value: newCount,
        },
      }),
    )

    // Call the update function directly for immediate response
    onUpdateGuestCount(table.id, newCount)

    setGuestInputMethod("buttons")

    // Reset touch flag after a short delay
    setTimeout(() => {
      touchInProgressRef.current = false
    }, 300)
  }, [guestCount, table.id, onUpdateGuestCount])

  // Handle number pad input
  const handleNumberPadInput = useCallback(
    (value: number) => {
      const newCount = Math.min(16, Math.max(0, value)) // Ensure between 0 and 16
      setGuestCount(newCount)

      // Update local state first for immediate UI feedback
      window.dispatchEvent(
        new CustomEvent("local-table-update", {
          detail: {
            tableId: table.id,
            field: "guestCount",
            value: newCount,
          },
        }),
      )

      // Call the update function directly for immediate response
      onUpdateGuestCount(table.id, newCount)

      setShowNumberPad(false)
      setGuestInputMethod("numberpad") // Mark that numberpad was used
      setValidationError(null) // Clear validation error if guest count is updated
    },
    [table.id, onUpdateGuestCount],
  )

  // Handle click on guest count to open number pad
  const handleGuestCountClick = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    setShowNumberPad(true)

    // Reset touch flag after a short delay
    setTimeout(() => {
      touchInProgressRef.current = false
    }, 300)
  }, [])

  // Handle end session with proper cleanup
  const handleEndSession = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    setIsClosing(true)
    setDialogOpen(false)
    // Use setTimeout to ensure dialog closes before ending session
    setTimeout(() => {
      onEndSession(table.id)
      onClose()
      touchInProgressRef.current = false
    }, 100)
  }, [table.id, onEndSession, onClose])

  // Validate and start session
  const validateAndStartSession = useCallback(() => {
    console.log("Validating session start:", { guestCount, server: table.server })

    // Check if guest count is greater than 0
    if (guestCount <= 0) {
      setValidationError("Please add at least one guest before starting the session")
      return false
    }

    // Check if server is assigned
    if (!table.server) {
      setValidationError("Please assign a server before starting the session")
      return false
    }

    // Clear validation error
    setValidationError(null)

    // All validation passed
    return true
  }, [guestCount, table.server])

  // Handle start session button click with validation
  const handleStartSessionClick = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    console.log("Start session button clicked")

    if (viewOnlyMode) {
      // In view-only mode, show notification instead of starting session
      setValidationError("Cannot start session in view-only mode")
      touchInProgressRef.current = false
      return
    }

    // Run validation
    if (!validateAndStartSession()) {
      touchInProgressRef.current = false
      return
    }

    // If all conditions are met, start the session
    console.log("Starting session for table:", table.id)
    setIsClosing(true)
    setDialogOpen(false)

    // Use setTimeout to ensure dialog closes before starting session
    setTimeout(() => {
      onStartSession(table.id)
      onClose()
      touchInProgressRef.current = false
    }, 100)
  }, [table.id, viewOnlyMode, validateAndStartSession, onStartSession, onClose])

  // Handle dialog close with proper cleanup
  const handleDialogClose = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    console.log("Dialog closing, table active status:", table.isActive)

    // Set closing state to prevent reopening
    setIsClosing(true)
    setDialogOpen(false)

    // Reset state when dialog is closed without starting a session
    if (!table.isActive) {
      console.log("Table is inactive, resetting all values")

      // Only reset guest count if it was changed but session wasn't started
      if (guestCount > 0) {
        setGuestCount(0)
        onUpdateGuestCount(table.id, 0)
        console.log("Reset guest count to 0")
      }

      // Only clear server assignment if it was set but session wasn't started
      if (table.server) {
        onAssignServer(table.id, null) // Explicitly pass null, not empty string
        console.log("Reset server assignment to null")
      }

      // Only clear notes if they were set but session wasn't started
      if (table.hasNotes || table.noteId || table.noteText) {
        onUpdateNotes(table.id, "", "")
        console.log("Reset notes to empty")
      }

      // Reset any group selections if they were made but session wasn't started
      if (table.groupId) {
        onUngroupTable(table.id)
        console.log("Reset group assignment")
      }
    }

    // Reset local state
    setSelectedTab("manage")
    setServerSelectionExpanded(!table.isActive)
    setEditingServer(!table.server) // Reset edit mode based on server selection
    setValidationError(null)

    // Clean up any intervals
    if (elapsedTimeIntervalRef.current) {
      clearInterval(elapsedTimeIntervalRef.current)
      elapsedTimeIntervalRef.current = null
    }

    // Call the onClose prop after a short delay
    setTimeout(() => {
      onClose()
      touchInProgressRef.current = false
    }, 100)
  }, [
    table.isActive,
    table.server,
    table.hasNotes,
    table.noteId,
    table.noteText,
    table.groupId,
    guestCount,
    table.id,
    onUpdateGuestCount,
    onAssignServer,
    onUpdateNotes,
    onUngroupTable,
    onClose,
  ])

  // Determine if table is in overtime
  const isOvertime = table.isActive && remainingTime < 0

  // Filter servers based on enabled status - memoized
  const availableServers = useMemo(() => {
    // Filter enabled servers and remove duplicates
    return servers
      .filter((server) => server.enabled !== false)
      .filter((server, index, self) => index === self.findIndex((s) => s.id === server.id))
  }, [servers])

  // Get the current server object
  const currentServer = useMemo(
    () => (table.server ? availableServers.find((s) => s.id === table.server) : null),
    [table.server, availableServers],
  )

  // Function to format start time
  const formatStartTime = useCallback((startTime: number | null | undefined) => {
    if (!startTime) return "N/A"
    const date = new Date(startTime)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [])

  // Function to format elapsed time
  const formatElapsedTime = useCallback(
    (ms: number) => {
      if (!table.isActive) {
        // For inactive tables, show the initial time (60 minutes)
        const totalMinutes = Math.floor(table.initialTime / 60000)
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        const seconds = 0
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      }

      // For active tables, show elapsed time
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    },
    [table.isActive, table.initialTime],
  )

  // Format remaining time as MM:SS - FIXED to properly show negative values
  const formatRemainingTime = useCallback((ms: number) => {
    const isNegative = ms < 0
    const totalSeconds = Math.floor(Math.abs(ms) / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const sign = isNegative ? "-" : ""
    return `${sign}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }, [])

  // Format time for display in timer - FIXED to properly show negative values
  const formatDisplayTime = useCallback(
    (ms: number) => {
      if (!table.isActive) {
        // For inactive tables, show the initial time in minutes
        const initialMinutes = Math.floor(ms / 60000)
        return `${initialMinutes.toString().padStart(2, "0")}:00`
      }

      // For active tables, show remaining time (including negative for overtime)
      return formatRemainingTime(ms)
    },
    [table.isActive, formatRemainingTime],
  )

  // Add the formatMinutes function if it doesn't exist
  const formatMinutes = useCallback((minutes: number) => {
    return Math.round(minutes)
  }, [])

  // If we're in the process of closing, don't render the dialog
  if (isClosing) {
    return null
  }

  return (
    <TooltipProvider>
      <Dialog open={dialogOpen} onOpenChange={() => handleDialogClose()}>
        <DialogContent
          className="max-w-[500px] bg-[#000018] text-white border-[#00FFFF] animate-in fade-in-50 duration-300 space-theme font-mono cursor-galaga overflow-y-auto p-0"
          style={{
            boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
            border: "2px solid #00FFFF",
          }}
        >
          <div className="p-4 space-y-4">
            {/* Header with table name and status */}
            <div className="flex items-center justify-between">
              <div className="text-[#00FFFF] text-xl font-bold">{table.name}</div>
              <div className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs">
                {table.isActive ? "Active" : "Inactive"}
              </div>
            </div>

            {/* Validation Error Message */}
            {validationError && (
              <div className="bg-red-900/50 border border-red-500 text-white p-2 rounded-md text-sm">
                {validationError}
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className={`h-10 text-sm border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] flex-1 ${
                  !isAuthenticated || viewOnlyMode || !hasPermission("canGroupTables") ? "opacity-50" : ""
                }`}
                onClick={() => isAuthenticated && hasPermission("canGroupTables") && setSelectedTab("merge")}
                disabled={!isAuthenticated || viewOnlyMode || !hasPermission("canGroupTables")}
              >
                Merge
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-10 text-sm border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] flex-1 ${
                  !isAuthenticated || viewOnlyMode || !hasPermission("canMoveTable") ? "opacity-50" : ""
                }`}
                onClick={() => isAuthenticated && hasPermission("canMoveTable") && setSelectedTab("move")}
                disabled={!isAuthenticated || viewOnlyMode || !hasPermission("canMoveTable")}
              >
                Move
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-10 text-sm border-[#FFFF00] bg-[#000033] hover:bg-[#000066] text-[#FFFF00] flex-1 relative ${
                  !isAuthenticated || viewOnlyMode || !hasPermission("canUpdateNotes") ? "opacity-50" : ""
                }`}
                onClick={() => isAuthenticated && hasPermission("canUpdateNotes") && setSelectedTab("notes")}
                disabled={!isAuthenticated || viewOnlyMode || !hasPermission("canUpdateNotes")}
              >
                Notes
              </Button>
            </div>

            {/* Timer Display with Play Button */}
            <div className="flex items-center justify-between gap-4 mt-2">
              <div className="flex-1 text-center">
                <div
                  className="p-3 rounded-md bg-[#000033] border border-[#00FFFF] mx-auto inline-block"
                  style={{
                    boxShadow: "0 0 15px rgba(0, 255, 255, 0.5)",
                  }}
                >
                  <div className="text-[#00FFFF] text-3xl font-bold">{formatDisplayTime(displayedRemainingTime)}</div>
                  <div className="text-[#00FFFF] text-xs mt-1">{initialTimeDisplay} min</div>
                  <div className="text-[#00FFFF] text-xs">{table.isActive ? "Time Remaining" : "Time Allotted"}</div>
                </div>
              </div>

              {/* Play Button */}
              {!table.isActive && hasPermission("canStartSession") ? (
                <Button
                  size="sm"
                  onClick={handleStartSessionClick}
                  className="h-14 w-14 p-0 rounded-full bg-[#00FF33] hover:bg-[#00CC00] text-black transition-transform duration-200 hover:scale-110 active:scale-95"
                  disabled={viewOnlyMode || !hasPermission("canStartSession")}
                >
                  <PlayIcon className="h-8 w-8" />
                </Button>
              ) : (
                table.isActive && (
                  <Button
                    size="sm"
                    onClick={handleEndSession}
                    className="h-14 w-14 p-0 rounded-full bg-[#FF3300] hover:bg-[#CC0000] text-white transition-transform duration-200 hover:scale-110 active:scale-95"
                    disabled={viewOnlyMode || !hasPermission("canEndSession")}
                  >
                    <span className="text-lg font-bold">End</span>
                  </Button>
                )
              )}
            </div>

            {/* Players Section */}
            <div className="mt-4">
              <div className="flex items-center justify-center mb-2">
                <UsersIcon className="mr-1 h-4 w-4 text-[#FF00FF]" />
                <h3 className="text-sm font-medium text-[#FF00FF]">Players</h3>
              </div>
              <div className="flex items-center justify-center gap-5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 border-2 border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] transition-all duration-200 active:scale-95 shadow-md"
                  onClick={handleDecrementGuests}
                  disabled={viewOnlyMode}
                >
                  <MinusIcon className="h-6 w-6" />
                </Button>
                <div
                  className="text-3xl font-bold w-20 h-14 text-center text-[#FF00FF] cursor-pointer rounded-md flex items-center justify-center transition-all duration-200 relative bg-[#110022] active:scale-95"
                  onClick={handleGuestCountClick}
                  style={{
                    boxShadow: "0 0 10px rgba(255, 0, 255, 0.5)",
                    border: "2px solid rgba(255, 0, 255, 0.7)",
                  }}
                >
                  {guestCount}
                  <span className="absolute bottom-1 right-1 text-[8px] text-[#FF00FF] opacity-70">tap</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 border-2 border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] transition-all duration-200 active:scale-95 shadow-md"
                  onClick={handleIncrementGuests}
                  disabled={viewOnlyMode}
                >
                  <PlusIcon className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* Server Section */}
            <div className="mt-4">
              <div className="flex items-center justify-center mb-2">
                <ServerIcon className="mr-1 h-4 w-4 text-[#00FF00]" />
                <h3 className="text-sm font-medium text-[#00FF00]">Server</h3>
              </div>

              {table.server && !editingServer ? (
                // Show only the selected server with an edit button
                <div className="flex items-center justify-center gap-2">
                  <div className="flex-1 bg-[#00FF00] text-black text-center py-2 px-3 rounded-md font-bold">
                    {getServerName(table.server)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-[#00FF00] active:scale-95"
                    onClick={toggleServerEditMode}
                    disabled={viewOnlyMode}
                  >
                    Edit
                  </Button>
                </div>
              ) : (
                // Show all servers in selection mode
                <div>
                  <div className="grid grid-cols-5 gap-2">
                    {availableServers && availableServers.length > 0 ? (
                      availableServers.slice(0, 5).map((server) => {
                        const isSelected = table.server === server.id
                        return (
                          <Button
                            key={server.id}
                            variant={isSelected ? "default" : "outline"}
                            className={
                              isSelected
                                ? "w-full justify-center bg-[#00FF00] hover:bg-[#00CC00] text-black text-xs h-7 px-1 touch-manipulation font-bold active:scale-95"
                                : "w-full justify-center border-2 border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-white text-xs h-7 px-1 touch-manipulation active:scale-95"
                            }
                            onClick={(e) => {
                              e.preventDefault()
                              handleServerSelection(server.id)
                            }}
                            disabled={viewOnlyMode}
                          >
                            <span className="truncate">{server.name}</span>
                          </Button>
                        )
                      })
                    ) : (
                      <div className="col-span-5 text-center text-gray-400">No servers available</div>
                    )}
                  </div>
                  {availableServers && availableServers.length > 5 && (
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {availableServers.slice(5, 10).map((server) => {
                        const isSelected = table.server === server.id
                        return (
                          <Button
                            key={server.id}
                            variant={isSelected ? "default" : "outline"}
                            className={
                              isSelected
                                ? "w-full justify-center bg-[#00FF00] hover:bg-[#00CC00] text-black text-xs h-7 px-1 touch-manipulation font-bold active:scale-95"
                                : "w-full justify-center border-2 border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-white text-xs h-7 px-1 touch-manipulation active:scale-95"
                            }
                            onClick={(e) => {
                              e.preventDefault()
                              handleServerSelection(server.id)
                            }}
                            disabled={viewOnlyMode}
                          >
                            <span className="truncate">{server.name}</span>
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Time Management Section */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* Add Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <ClockIcon className="mr-1 h-4 w-4 text-[#00FFFF]" />
                  <h3 className="text-sm font-medium text-[#00FFFF]">Add Time</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-2 border-[#00FFFF] bg-[#000033] hover:bg-[#000066] hover:border-[#00FFFF] text-[#00FFFF] transition-all duration-200 active:scale-95"
                    onClick={() => handleAddTime(5)}
                    disabled={viewOnlyMode}
                  >
                    +5 min
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-[#00FFFF] bg-[#000033] hover:bg-[#000066] hover:border-[#00FFFF] text-[#00FFFF] transition-all duration-200 active:scale-95"
                    onClick={() => handleAddTime(15)}
                    disabled={viewOnlyMode}
                  >
                    +15 min
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-[#00FFFF] bg-[#000033] hover:bg-[#000066] hover:border-[#00FFFF] text-[#00FFFF] transition-all duration-200 active:scale-95"
                    onClick={() => handleAddTime(30)}
                    disabled={viewOnlyMode}
                  >
                    +30 min
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-[#00FFFF] bg-[#000033] hover:bg-[#000066] hover:border-[#00FFFF] text-[#00FFFF] transition-all duration-200 active:scale-95"
                    onClick={() => handleAddTime(60)}
                    disabled={viewOnlyMode}
                  >
                    +60 min
                  </Button>
                </div>
              </div>

              {/* Subtract Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <ArrowDownIcon className="mr-1 h-4 w-4 text-[#FFFF00]" />
                  <h3 className="text-sm font-medium text-[#FFFF00]">Subtract Time</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-2 border-[#FFFF00] bg-[#000033] hover:bg-[#000066] hover:border-[#FFFF00] text-[#FFFF00] transition-all duration-200 active:scale-95"
                    onClick={() => handleSubtractTime(5)}
                    disabled={viewOnlyMode}
                  >
                    -5 min
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-[#FFFF00] bg-[#000033] hover:bg-[#000066] hover:border-[#FFFF00] text-[#FFFF00] transition-all duration-200 active:scale-95"
                    onClick={() => handleSubtractTime(15)}
                    disabled={viewOnlyMode}
                  >
                    -15 min
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-[#FFFF00] bg-[#000033] hover:bg-[#000066] hover:border-[#FFFF00] text-[#FFFF00] transition-all duration-200 active:scale-95"
                    onClick={() => handleSubtractTime(30)}
                    disabled={viewOnlyMode}
                  >
                    -30 min
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-[#FFFF00] bg-[#000033] hover:bg-[#000066] hover:border-[#FFFF00] text-[#FFFF00] transition-all duration-200 active:scale-95"
                    onClick={() => handleSubtractTime(60)}
                    disabled={viewOnlyMode}
                  >
                    -60 min
                  </Button>
                </div>
              </div>
            </div>

            {selectedTab === "merge" && (
              <div className="mt-4 space-y-3">
                <h3 className="text-center text-sm font-medium text-[#FF00FF]">Select tables to merge into a group</h3>

                {/* Timer display - keep this consistent with the main timer display */}
                <div className="flex justify-center items-center mb-4">
                  <div
                    className="p-3 rounded-md bg-[#000033] border border-[#00FFFF] mx-auto inline-block"
                    style={{
                      boxShadow: "0 0 15px rgba(0, 255, 255, 0.5)",
                    }}
                  >
                    <div className="text-[#00FFFF] text-3xl font-bold">{formatDisplayTime(displayedRemainingTime)}</div>
                    <div className="text-[#00FFFF] text-xs mt-1">{initialTimeDisplay} min</div>
                    <div className="text-[#00FFFF] text-xs">{table.isActive ? "Time Remaining" : "Time Allotted"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {allTables
                    .filter((t) => !t.isActive || t.groupId === table.groupId)
                    .map((t) => (
                      <Button
                        key={t.id}
                        variant={selectedTables.includes(t.id) ? "default" : "outline"}
                        className={
                          selectedTables.includes(t.id)
                            ? "w-full bg-[#FF00FF] text-white active:scale-95"
                            : "w-full border-[#FF00FF] text-[#FF00FF] active:scale-95"
                        }
                        onClick={() => toggleTableSelection(t.id)}
                      >
                        {t.name}
                      </Button>
                    ))}
                </div>

                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTab("manage")}
                    className="border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] active:scale-95"
                  >
                    Back
                  </Button>

                  <Button
                    className="bg-[#FF00FF] hover:bg-[#CC00CC] text-white active:scale-95"
                    onClick={handleCreateGroup}
                    disabled={selectedTables.length < 2}
                  >
                    Create Group
                  </Button>
                </div>
              </div>
            )}

            {selectedTab === "move" && (
              <div className="mt-4 space-y-3">
                <h3 className="text-center text-sm font-medium text-[#00FFFF]">Select target table</h3>

                {/* Timer display - keep this consistent with the main timer display */}
                <div className="flex justify-center items-center mb-4">
                  <div
                    className="p-3 rounded-md bg-[#000033] border border-[#00FFFF] mx-auto inline-block"
                    style={{
                      boxShadow: "0 0 15px rgba(0, 255, 255, 0.5)",
                    }}
                  >
                    <div className="text-[#00FFFF] text-3xl font-bold">{formatDisplayTime(displayedRemainingTime)}</div>
                    <div className="text-[#00FFFF] text-xs mt-1">{initialTimeDisplay} min</div>
                    <div className="text-[#00FFFF] text-xs">{table.isActive ? "Time Remaining" : "Time Allotted"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {allTables
                    .filter((t) => t.id !== table.id && !t.isActive)
                    .map((t) => (
                      <Button
                        key={t.id}
                        variant={targetTableId === t.id ? "default" : "outline"}
                        className={
                          targetTableId === t.id
                            ? "w-full bg-[#00FFFF] text-black active:scale-95"
                            : "w-full border-[#00FFFF] text-[#00FFFF] active:scale-95"
                        }
                        onClick={() => setTargetTableId(t.id)}
                      >
                        {t.name}
                      </Button>
                    ))}
                </div>
                {allTables.filter((t) => t.id !== table.id && !t.isActive).length === 0 && (
                  <p className="text-center text-gray-400">No available target tables</p>
                )}

                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTab("manage")}
                    className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] active:scale-95"
                  >
                    Back
                  </Button>

                  <Button
                    className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black active:scale-95"
                    onClick={handleMoveTable}
                    disabled={!targetTableId}
                  >
                    Move Table Data
                  </Button>
                </div>
              </div>
            )}

            {selectedTab === "notes" && (
              <div className="mt-4 space-y-3">
                <h3 className="text-center text-sm font-medium text-[#FFFF00]">Select note template</h3>

                {/* Timer display - keep this consistent with the main timer display */}
                <div className="flex justify-center items-center mb-4">
                  <div
                    className="p-3 rounded-md bg-[#000033] border border-[#00FFFF] mx-auto inline-block"
                    style={{
                      boxShadow: "0 0 15px rgba(0, 255, 255, 0.5)",
                    }}
                  >
                    <div className="text-[#00FFFF] text-3xl font-bold">{formatDisplayTime(displayedRemainingTime)}</div>
                    <div className="text-[#00FFFF] text-xs mt-1">{initialTimeDisplay} min</div>
                    <div className="text-[#00FFFF] text-xs">{table.isActive ? "Time Remaining" : "Time Allotted"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedNoteId === "" ? "default" : "outline"}
                    className={
                      selectedNoteId === ""
                        ? "w-full bg-[#FFFF00] text-black active:scale-95"
                        : "w-full border-[#FFFF00] text-[#FFFF00] active:scale-95"
                    }
                    onClick={() => handleNoteSelection("")}
                  >
                    No Note
                  </Button>
                  {noteTemplates.map((note) => (
                    <Button
                      key={note.id}
                      variant={selectedNoteId === note.id ? "default" : "outline"}
                      className={
                        selectedNoteId === note.id
                          ? "w-full bg-[#FFFF00] text-black active:scale-95"
                          : "w-full border-[#FFFF00] text-[#FFFF00] active:scale-95"
                      }
                      onClick={() => handleNoteSelection(note.id)}
                    >
                      {note.text.substring(0, 15)}
                      {note.text.length > 15 ? "..." : ""}
                    </Button>
                  ))}
                </div>
                {selectedNoteId && (
                  <div className="p-2 bg-[#111100] rounded-md border border-[#FFFF00]/50">
                    <p className="text-[#FFFF00]">{noteTemplates.find((n) => n.id === selectedNoteId)?.text || ""}</p>
                  </div>
                )}

                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTab("manage")}
                    className="border-[#FFFF00] bg-[#000033] hover:bg-[#000066] text-[#FFFF00] active:scale-95"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Recommendations Message */}
            <div className="text-center text-[#00FFFF] text-sm mt-4">
              {guestCount === 0 ? "Add guest count to see recommendations" : <MenuRecommendations table={table} />}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#00FFFF]/30">
            <Button
              variant="outline"
              onClick={handleDialogClose}
              className="w-full border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] h-10 active:scale-95"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Number Pad for Guest Count */}
      {showNumberPad && (
        <NumberPad
          open={showNumberPad}
          onClose={() => setShowNumberPad(false)}
          onSubmit={handleNumberPadInput}
          initialValue={guestCount}
          maxValue={16}
          minValue={0}
          title="Enter Guest Count"
        />
      )}

      {/* Time Change Confirmation Dialog */}
      {showTimeConfirmation && pendingTimeAction && (
        <Dialog open={showTimeConfirmation} onOpenChange={() => setShowTimeConfirmation(false)}>
          <DialogContent
            className="sm:max-w-[400px] bg-black text-white border-[#00FFFF] space-theme font-mono"
            style={{
              backgroundImage: "linear-gradient(to bottom, #000033, #000011)",
              boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-lg text-[#00FFFF] flex items-center justify-between">
                <span>Confirm Time Change</span>
              </DialogTitle>
            </DialogHeader>

            <div className="py-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="text-center text-xl">
                  {pendingTimeAction.type === "add" ? (
                    <span className="text-[#00FFFF]">+{pendingTimeAction.minutes} minutes</span>
                  ) : (
                    <span className="text-[#FFFF00]">-{pendingTimeAction.minutes} minutes</span>
                  )}
                </div>

                <p className="text-center text-white">
                  Are you sure you want to {pendingTimeAction.type === "add" ? "add" : "subtract"} time
                  {pendingTimeAction.type === "add" ? " to " : " from "}
                  <span className="font-bold">{table.name}</span>?
                </p>
              </div>
            </div>

            <DialogFooter className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setShowTimeConfirmation(false)}
                className="border-gray-600 bg-[#000033] hover:bg-[#000066] text-white active:scale-95"
              >
                Cancel
              </Button>
              <Button
                onClick={executeTimeChange}
                className={
                  pendingTimeAction.type === "add"
                    ? "bg-[#00FFFF] hover:bg-[#00CCCC] text-black font-bold active:scale-95"
                    : "bg-[#FFFF00] hover:bg-[#CCCC00] text-black font-bold active:scale-95"
                }
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  )
}
