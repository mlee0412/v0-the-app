"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  PlusIcon,
  MinusIcon,
  UsersIcon,
  ClockIcon,
  ServerIcon,
  ArrowDownIcon,
  PlayIcon,
  FileTextIcon,
  BrainIcon,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Table, Server, NoteTemplate, LogEntry } from "@/components/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
import type { User } from "@/services/user-service"
import { TooltipProvider } from "@/components/ui/tooltip"
import { NumberPad } from "@/components/number-pad"
import { MenuRecommendations } from "@/components/menu-recommendations"
import { useMobileDetect } from "@/hooks/use-mobile"

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
  onAssignServer: (tableId: number, serverId: string | null) => void
  onGroupTables: (tableIds: number[]) => void
  onUngroupTable: (tableId: number) => void
  onMoveTable: (sourceId: number, targetId: number) => void
  onUpdateNotes: (tableId: number, noteId: string, noteText: string) => void
  getServerName: (serverId: string | null) => string
  currentUser: User | null
  hasPermission: (permission: string) => boolean
  viewOnlyMode?: boolean
}

export default function TableDialog({
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
  const [dialogOpen, setDialogOpen] = useState(true)
  const [editingServer, setEditingServer] = useState(!table.server)
  const [initialTimeDisplay, setInitialTimeDisplay] = useState(Math.floor(table.initialTime / 60000))

  const isMobile = useMobileDetect()
  const [mobileTabView, setMobileTabView] = useState<"logs" | "menu" | "ai">("logs")
  const [logActionFilter, setLogActionFilter] = useState<string | null>(null)

  // Define a variable to track if we should render the dialog
  const shouldRenderDialog = !isClosing

  // Local table state for immediate UI updates
  const [localTable, setLocalTable] = useState<Table>(table)

  // Refs to track current values for immediate UI updates
  const currentGuestCountRef = useRef(table.guestCount)
  const currentServerRef = useRef(table.server)
  const currentRemainingTimeRef = useRef(table.remainingTime)
  const currentInitialTimeRef = useRef(table.initialTime)
  const touchInProgressRef = useRef(false)

  // Debounce timers for background updates
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const updateGuestCountRef = useRef<NodeJS.Timeout | null>(null)
  const updateServerRef = useRef<NodeJS.Timeout | null>(null)
  const updateNotesRef = useRef<NodeJS.Timeout | null>(null)

  // Memoize available servers to prevent unnecessary recalculations
  const availableServers = useMemo(() => {
    // Filter enabled servers and remove duplicates
    return servers
      .filter((server) => server.enabled !== false)
      .filter((server, index, self) => index === self.findIndex((s) => s.id === server.id))
  }, [servers])

  // Update local table when props change
  useEffect(() => {
    setLocalTable(table)
    currentGuestCountRef.current = table.guestCount
    currentServerRef.current = table.server
    currentRemainingTimeRef.current = table.remainingTime
    currentInitialTimeRef.current = table.initialTime

    // Only update displayed values if we're not in the middle of a time change
    if (!pendingTimeAction) {
      setDisplayedRemainingTime(table.remainingTime)
      setRemainingTime(table.remainingTime)
      setInitialTimeDisplay(Math.floor(table.initialTime / 60000))
    }

    setGuestCount(table.guestCount)
    setSelectedNoteId(table.noteId || "")
  }, [table, pendingTimeAction])

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

  // Calculate remaining time - FIXED to allow negative values
  const calculateRemainingTime = useCallback(() => {
    if (!localTable.isActive) return localTable.initialTime
    if (!localTable.startTime) return localTable.remainingTime

    const elapsed = Date.now() - localTable.startTime
    // REMOVED Math.max to allow negative values for overtime
    return localTable.initialTime - elapsed
  }, [localTable.isActive, localTable.startTime, localTable.initialTime, localTable.remainingTime])

  // Listen for global time tick instead of using our own interval
  useEffect(() => {
    // Always define the handler function, regardless of table state
    const handleGlobalTimeTick = (event: Event) => {
      const customEvent = event as CustomEvent
      if (localTable.isActive && localTable.startTime) {
        const now = customEvent.detail.timestamp
        const newElapsedTime = now - localTable.startTime
        const newRemainingTime = localTable.initialTime - newElapsedTime

        // Use requestAnimationFrame to ensure updates happen outside render cycle
        requestAnimationFrame(() => {
          setElapsedTime(newElapsedTime)
          setRemainingTime(newRemainingTime)
          setDisplayedRemainingTime(newRemainingTime)
          currentRemainingTimeRef.current = newRemainingTime
        })
      }
    }

    // Always add the event listener
    window.addEventListener("global-time-tick", handleGlobalTimeTick)

    // Always perform initial calculations, but conditionally set values
    if (localTable.isActive && localTable.startTime) {
      const now = Date.now()
      const newElapsedTime = now - localTable.startTime
      const newRemainingTime = localTable.initialTime - newElapsedTime

      setElapsedTime(newElapsedTime)
      setRemainingTime(newRemainingTime)
      setDisplayedRemainingTime(newRemainingTime)
      currentRemainingTimeRef.current = newRemainingTime
    } else {
      setElapsedTime(0)
      setRemainingTime(localTable.initialTime)
      setDisplayedRemainingTime(localTable.initialTime)
      setInitialTimeDisplay(Math.floor(localTable.initialTime / 60000))
    }

    // Always return the cleanup function
    return () => {
      window.removeEventListener("global-time-tick", handleGlobalTimeTick)
    }
  }, [localTable.isActive, localTable.startTime, localTable.initialTime, calculateRemainingTime])

  // Handle group table selection
  const toggleTableSelection = useCallback((tableId: number) => {
    setSelectedTables((prev) => (prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]))
    setValidationError(null) // Clear any validation errors when selection changes
  }, [])

  // Create group - handle locally first, then update in background
  const handleCreateGroup = useCallback(() => {
    if (selectedTables.length < 2) {
      setValidationError("Please select at least two tables to create a group")
      return
    }

    // Close dialog immediately for responsive UI
    handleDialogClose()

    // Update in background
    setTimeout(() => {
      onGroupTables(selectedTables)
    }, 0)
  }, [selectedTables, onGroupTables])

  // Handle ungroup - handle locally first, then update in background
  const handleUngroup = useCallback(() => {
    // Close dialog immediately for responsive UI
    handleDialogClose()

    // Update in background
    setTimeout(() => {
      onUngroupTable(table.id)
    }, 0)
  }, [onUngroupTable, table.id])

  // Handle move table - handle locally first, then update in background
  const handleMoveTable = useCallback(() => {
    if (!targetTableId) {
      setValidationError("Please select a target table")
      return
    }

    // Close dialog immediately for responsive UI
    handleDialogClose()

    // Update in background
    setTimeout(() => {
      onMoveTable(table.id, targetTableId)
    }, 0)
  }, [targetTableId, onMoveTable, table.id])

  // Handle note selection with immediate local update
  const handleNoteSelection = useCallback(
    (noteId: string) => {
      // Clear any existing timeout
      if (updateNotesRef.current) {
        clearTimeout(updateNotesRef.current)
      }

      // Update local state immediately
      setSelectedNoteId(noteId)

      // Find the note text if a note is selected
      let noteText = ""
      if (noteId) {
        const selectedTemplate = noteTemplates.find((t) => t.id === noteId)
        if (selectedTemplate) {
          noteText = selectedTemplate.text
        }
      }

      // Update local table state
      setLocalTable((prev) => ({
        ...prev,
        noteId,
        noteText,
        hasNotes: !!noteId,
      }))

      // Dispatch local update event for other components
      window.dispatchEvent(
        new CustomEvent("local-table-update", {
          detail: {
            tableId: table.id,
            field: "notes",
            value: {
              noteId,
              noteText,
              hasNotes: !!noteId,
            },
          },
        }),
      )

      // Update in background with debounce
      updateNotesRef.current = setTimeout(() => {
        onUpdateNotes(table.id, noteId, noteText)
      }, 300)
    },
    [noteTemplates, table.id, onUpdateNotes],
  )

  // Toggle edit mode for server selection
  const toggleServerEditMode = useCallback(() => {
    setEditingServer(!editingServer)
    // When entering edit mode, expand the server selection
    if (!editingServer) {
      setServerSelectionExpanded(true)
    }
  }, [editingServer])

  // Handle server selection with immediate local update
  const handleServerSelection = useCallback(
    (serverId: string) => {
      // Prevent multiple rapid clicks
      if (touchInProgressRef.current) return
      touchInProgressRef.current = true

      // Clear any existing timeout
      if (updateServerRef.current) {
        clearTimeout(updateServerRef.current)
      }

      // Update local state immediately
      currentServerRef.current = serverId

      // Update local table state - ensure this is done correctly
      setLocalTable((prev) => ({
        ...prev,
        server: serverId,
      }))

      // Exit edit mode after selection
      setEditingServer(false)
      // Hide server selection after making a choice
      setServerSelectionExpanded(false)

      // Clear validation error
      setValidationError(null)

      // Dispatch local update event for other components
      window.dispatchEvent(
        new CustomEvent("local-table-update", {
          detail: {
            tableId: table.id,
            field: "server",
            value: serverId,
          },
        }),
      )

      // Update in background with debounce
      updateServerRef.current = setTimeout(() => {
        onAssignServer(table.id, serverId)
      }, 300)

      // Reset touch flag after a short delay
      setTimeout(() => {
        touchInProgressRef.current = false
      }, 100)
    },
    [table.id, onAssignServer],
  )

  // Check if current user can manage this table
  const canManageTable = useMemo(
    () =>
      isAdmin ||
      (isServer && currentUser && (localTable.server === currentUser.id || !localTable.server)) ||
      hasPermission("canAssignServer"),
    [isAdmin, isServer, currentUser, localTable.server, hasPermission],
  )

  // Toggle server selection expansion
  const toggleServerSelection = useCallback(() => {
    if (localTable.isActive && canManageTable) {
      setServerSelectionExpanded(!serverSelectionExpanded)
    }
  }, [localTable.isActive, serverSelectionExpanded, canManageTable])

  // Handle add time with immediate local update
  const handleAddTime = useCallback(
    (minutes: number) => {
      // Prevent multiple rapid clicks
      if (touchInProgressRef.current) return
      touchInProgressRef.current = true

      // Update the display immediately
      const additionalMs = minutes * 60 * 1000
      const newRemainingTime = remainingTime + additionalMs
      const newInitialTime = localTable.initialTime + additionalMs

      // Update displayed values immediately
      setDisplayedRemainingTime(newRemainingTime)
      setRemainingTime(newRemainingTime)
      setInitialTimeDisplay(Math.floor(newInitialTime / 60000))

      // Store the pending action for confirmation
      setPendingTimeAction({ type: "add", minutes })
      setShowTimeConfirmation(true)

      // Reset touch flag after a short delay
      setTimeout(() => {
        touchInProgressRef.current = false
      }, 100)
    },
    [remainingTime, localTable.initialTime],
  )

  // Handle subtract time with immediate local update
  const handleSubtractTime = useCallback(
    (minutes: number) => {
      // Prevent multiple rapid clicks
      if (touchInProgressRef.current) return
      touchInProgressRef.current = true

      // Update the display immediately
      const additionalMs = minutes * 60 * 1000
      const newRemainingTime = remainingTime - additionalMs
      const newInitialTime = Math.max(0, localTable.initialTime - additionalMs)

      // Update displayed values immediately
      setDisplayedRemainingTime(newRemainingTime)
      setRemainingTime(newRemainingTime)
      setInitialTimeDisplay(Math.floor(newInitialTime / 60000))

      // Store the pending action for confirmation
      setPendingTimeAction({ type: "subtract", minutes })
      setShowTimeConfirmation(true)

      // Reset touch flag after a short delay
      setTimeout(() => {
        touchInProgressRef.current = false
      }, 100)
    },
    [remainingTime, localTable.initialTime],
  )

  // Execute time change with immediate local update
  const executeTimeChange = useCallback(() => {
    if (!pendingTimeAction) return

    // Clear any existing timeout
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current)
    }

    // Calculate new times
    const additionalMs = pendingTimeAction.minutes * 60 * 1000
    const newRemainingTime =
      pendingTimeAction.type === "add" ? remainingTime + additionalMs : remainingTime - additionalMs
    const newInitialTime =
      pendingTimeAction.type === "add"
        ? localTable.initialTime + additionalMs
        : Math.max(0, localTable.initialTime - additionalMs)

    // Update local state immediately
    setRemainingTime(newRemainingTime)
    setDisplayedRemainingTime(newRemainingTime)
    setInitialTimeDisplay(Math.floor(newInitialTime / 60000))
    currentRemainingTimeRef.current = newRemainingTime
    currentInitialTimeRef.current = newInitialTime

    // Update local table state
    setLocalTable((prev) => ({
      ...prev,
      remainingTime: newRemainingTime,
      initialTime: newInitialTime,
    }))

    // Clear pending action state
    setShowTimeConfirmation(false)
    const actionType = pendingTimeAction.type
    const actionMinutes = pendingTimeAction.minutes
    setPendingTimeAction(null)

    // Dispatch local update event for other components
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

    // Update in background with debounce
    updateTimerRef.current = setTimeout(() => {
      if (actionType === "add") {
        onAddTime(table.id, actionMinutes)
      } else {
        onSubtractTime(table.id, actionMinutes)
      }
    }, 300)
  }, [pendingTimeAction, remainingTime, table.id, localTable.initialTime, onAddTime, onSubtractTime])

  // Listen for time updates from the confirmation dialog
  useEffect(() => {
    let previewRemainingTime = remainingTime
    let previewInitialTime = initialTimeDisplay

    if (showTimeConfirmation && pendingTimeAction) {
      // Pre-calculate what the new time would be
      previewRemainingTime =
        pendingTimeAction.type === "add"
          ? remainingTime + pendingTimeAction.minutes * 60 * 1000
          : remainingTime - pendingTimeAction.minutes * 60 * 1000

      previewInitialTime =
        pendingTimeAction.type === "add"
          ? Math.floor((localTable.initialTime + pendingTimeAction.minutes * 60 * 1000) / 60000)
          : Math.floor(Math.max(0, localTable.initialTime - pendingTimeAction.minutes * 60 * 1000) / 60000)
    }

    // Show the preview time while confirmation is open
    setDisplayedRemainingTime(previewRemainingTime)
    setInitialTimeDisplay(previewInitialTime)
  }, [showTimeConfirmation, pendingTimeAction, remainingTime, localTable.initialTime, initialTimeDisplay])

  // Handle guest count increment with immediate local update
  const handleIncrementGuests = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    // Clear any existing timeout
    if (updateGuestCountRef.current) {
      clearTimeout(updateGuestCountRef.current)
    }

    // Update local state immediately
    const newCount = Math.min(16, currentGuestCountRef.current + 1) // Limit to 16
    currentGuestCountRef.current = newCount
    setGuestCount(newCount)

    // Update local table state
    setLocalTable((prev) => ({
      ...prev,
      guestCount: newCount,
    }))

    // Dispatch local update event for other components
    window.dispatchEvent(
      new CustomEvent("local-table-update", {
        detail: {
          tableId: table.id,
          field: "guestCount",
          value: newCount,
        },
      }),
    )

    // Update in background with debounce
    updateGuestCountRef.current = setTimeout(() => {
      onUpdateGuestCount(table.id, newCount)
    }, 300)

    setGuestInputMethod("buttons")
    setValidationError(null) // Clear validation error if guest count is updated

    // Reset touch flag after a short delay
    setTimeout(() => {
      touchInProgressRef.current = false
    }, 100)
  }, [table.id, onUpdateGuestCount])

  // Handle guest count decrement with immediate local update
  const handleDecrementGuests = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    // Clear any existing timeout
    if (updateGuestCountRef.current) {
      clearTimeout(updateGuestCountRef.current)
    }

    // Update local state immediately
    const newCount = Math.max(0, currentGuestCountRef.current - 1)
    currentGuestCountRef.current = newCount
    setGuestCount(newCount)

    // Update local table state
    setLocalTable((prev) => ({
      ...prev,
      guestCount: newCount,
    }))

    // Dispatch local update event for other components
    window.dispatchEvent(
      new CustomEvent("local-table-update", {
        detail: {
          tableId: table.id,
          field: "guestCount",
          value: newCount,
        },
      }),
    )

    // Update in background with debounce
    updateGuestCountRef.current = setTimeout(() => {
      onUpdateGuestCount(table.id, newCount)
    }, 300)

    setGuestInputMethod("buttons")

    // Reset touch flag after a short delay
    setTimeout(() => {
      touchInProgressRef.current = false
    }, 100)
  }, [table.id, onUpdateGuestCount])

  // Handle number pad input with immediate local update
  const handleNumberPadInput = useCallback(
    (value: number) => {
      // Clear any existing timeout
      if (updateGuestCountRef.current) {
        clearTimeout(updateGuestCountRef.current)
      }

      // Update local state immediately
      const newCount = Math.min(16, Math.max(0, value)) // Ensure between 0 and 16
      currentGuestCountRef.current = newCount
      setGuestCount(newCount)

      // Update local table state
      setLocalTable((prev) => ({
        ...prev,
        guestCount: newCount,
      }))

      // Dispatch local update event for other components
      window.dispatchEvent(
        new CustomEvent("local-table-update", {
          detail: {
            tableId: table.id,
            field: "guestCount",
            value: newCount,
          },
        }),
      )

      // Update in background with debounce
      updateGuestCountRef.current = setTimeout(() => {
        onUpdateGuestCount(table.id, newCount)
      }, 300)

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
    }, 100)
  }, [])

  // Handle end session with proper cleanup
  const handleEndSession = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    // Close dialog immediately for responsive UI
    setIsClosing(true)
    setDialogOpen(false)

    // End session in background
    setTimeout(() => {
      onEndSession(table.id)
      onClose()
      touchInProgressRef.current = false
    }, 100)
  }, [table.id, onEndSession, onClose])

  // Validate and start session
  const validateAndStartSession = useCallback(() => {
    // Check if guest count is greater than 0
    if (localTable.guestCount <= 0) {
      setValidationError("Please add at least one guest before starting the session")
      setSelectedTab("manage") // Redirect to manage tab
      return false
    }

    // Check if server is assigned
    if (!localTable.server) {
      setValidationError("Please assign a server before starting the session")
      setSelectedTab("manage") // Redirect to manage tab
      return false
    }

    // Clear validation error
    setValidationError(null)

    // All validation passed
    return true
  }, [localTable.guestCount, localTable.server])

  // Handle start session button click with validation
  const handleStartSessionClick = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

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

    // Close dialog immediately for responsive UI
    setIsClosing(true)
    setDialogOpen(false)

    // Start session in background with the updated local state values
    setTimeout(() => {
      // Make sure we pass the current values from local state
      onStartSession(localTable.id)
      onClose()
      touchInProgressRef.current = false
    }, 100)
  }, [localTable, viewOnlyMode, validateAndStartSession, onStartSession, onClose])

  // Handle dialog close with proper cleanup
  const handleDialogClose = useCallback(() => {
    // Prevent multiple rapid clicks
    if (touchInProgressRef.current) return
    touchInProgressRef.current = true

    // Set closing state to prevent reopening
    setIsClosing(true)
    setDialogOpen(false)

    // Reset state when dialog is closed without starting a session
    if (!localTable.isActive) {
      // Only reset guest count if it was changed but session wasn't started
      if (guestCount > 0) {
        currentGuestCountRef.current = 0
        onUpdateGuestCount(table.id, 0)
      }

      // Only clear server assignment if it was set but session wasn't started
      if (localTable.server) {
        currentServerRef.current = null
        onAssignServer(table.id, null) // Explicitly pass null, not empty string
      }

      // Only clear notes if they were set but session wasn't started
      if (localTable.hasNotes || localTable.noteId || localTable.noteText) {
        onUpdateNotes(table.id, "", "")
      }

      // Reset any group selections if they were made but session wasn't started
      if (localTable.groupId) {
        onUngroupTable(table.id)
      }
    }

    // Reset local state
    setSelectedTab("manage")
    setServerSelectionExpanded(!localTable.isActive)
    setEditingServer(!localTable.server) // Reset edit mode based on server selection
    setValidationError(null)

    // Call the onClose prop after a short delay
    setTimeout(() => {
      onClose()
      touchInProgressRef.current = false
    }, 100)
  }, [
    localTable.isActive,
    localTable.server,
    localTable.hasNotes,
    localTable.noteId,
    localTable.noteText,
    localTable.groupId,
    guestCount,
    table.id,
    onUpdateGuestCount,
    onAssignServer,
    onUpdateNotes,
    onUngroupTable,
    onClose,
  ])

  // Clean up any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current)
      if (updateGuestCountRef.current) clearTimeout(updateGuestCountRef.current)
      if (updateServerRef.current) clearTimeout(updateServerRef.current)
      if (updateNotesRef.current) clearTimeout(updateNotesRef.current)
    }
  }, [])

  // Determine if table is in overtime
  const isOvertime = localTable.isActive && remainingTime < 0

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
      if (!localTable.isActive) {
        // For inactive tables, show the initial time (60 minutes)
        const totalMinutes = Math.floor(localTable.initialTime / 60000)
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
    [localTable.isActive, localTable.initialTime],
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
      if (!localTable.isActive) {
        // For inactive tables, show the initial time in minutes
        const initialMinutes = Math.floor(ms / 60000)
        return `${initialMinutes.toString().padStart(2, "0")}:00`
      }

      // For active tables, show remaining time (including negative for overtime)
      return formatRemainingTime(ms)
    },
    [localTable.isActive, formatRemainingTime],
  )

  // Add the formatMinutes function if it doesn't exist
  const formatMinutes = useCallback((minutes: number) => {
    return Math.round(minutes)
  }, [])

  // Get unique action types from logs
  const getUniqueActionTypes = useCallback(() => {
    if (!logs) return []

    const uniqueActions = new Set<string>()
    logs.forEach((log) => {
      if (log.tableId === table.id && table.sessionStartTime && log.timestamp >= table.sessionStartTime && log.action) {
        uniqueActions.add(log.action)
      }
    })

    return Array.from(uniqueActions).sort()
  }, [logs, table.id, table.sessionStartTime])

  // Reusable timer display component that's clickable
  const TimerDisplay = useCallback(() => {
    return (
      <div className="flex justify-center items-center mb-4 cursor-pointer" onClick={() => setSelectedTab("manage")}>
        <div
          className="p-3 rounded-md bg-[#000033] border border-[#00FFFF] inline-block"
          style={{
            boxShadow: "0 0 15px rgba(0, 255, 255, 0.5)",
          }}
        >
          <div className="text-[#00FFFF] text-3xl font-bold">{formatDisplayTime(displayedRemainingTime)}</div>
          <div className="text-[#00FFFF] text-xs mt-1">{initialTimeDisplay} min</div>
          <div className="text-[#00FFFF] text-xs">{localTable.isActive ? "Time Remaining" : "Time Allotted"}</div>
        </div>
      </div>
    )
  }, [displayedRemainingTime, initialTimeDisplay, localTable.isActive, formatDisplayTime, setSelectedTab])

  // Reusable play/end button component
  const ActionButton = useCallback(() => {
    return !localTable.isActive && hasPermission("canStartSession") ? (
      <Button
        size="sm"
        onClick={handleStartSessionClick}
        className="h-14 w-14 p-0 rounded-full bg-[#00FF33] hover:bg-[#00CC00] text-black transition-transform duration-200 hover:scale-110 active:scale-95"
        disabled={viewOnlyMode || !hasPermission("canStartSession")}
      >
        <PlayIcon className="h-8 w-8" />
      </Button>
    ) : (
      localTable.isActive && (
        <Button
          size="sm"
          onClick={handleEndSession}
          className="h-14 w-14 p-0 rounded-full bg-[#FF3300] hover:bg-[#CC0000] text-white transition-transform duration-200 hover:scale-110 active:scale-95"
          disabled={viewOnlyMode || !hasPermission("canEndSession")}
        >
          <span className="text-lg font-bold">End</span>
        </Button>
      )
    )
  }, [localTable.isActive, hasPermission, handleStartSessionClick, handleEndSession, viewOnlyMode])

  // Add this near the top of the component, after the state declarations
  useEffect(() => {
    console.log("Local table updated:", localTable)
  }, [localTable])

  // Instead of early return, we'll use conditional rendering at the end
  useEffect(() => {
    console.log("Local table updated:", localTable)
  }, [localTable])

  // Instead of early return, we'll use conditional rendering at the end
  if (shouldRenderDialog) {
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
            {isMobile ? (
              // Mobile view - restricted functionality
              <div className="p-4 space-y-4">
                {/* Header with table name and status */}
                <div className="flex items-center justify-between">
                  <div className="text-[#00FFFF] text-xl font-bold">{localTable.name}</div>
                  <div className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs">
                    {localTable.isActive ? "Active" : "Inactive"}
                  </div>
                </div>

                {/* Elapsed time and remaining time display */}
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div
                    className="p-3 rounded-md bg-[#000033] border border-[#00FFFF] inline-block"
                    style={{
                      boxShadow: "0 0 15px rgba(0, 255, 255, 0.5)",
                    }}
                  >
                    <div className="text-[#00FFFF] text-3xl font-bold">{formatDisplayTime(displayedRemainingTime)}</div>
                    <div className="text-[#00FFFF] text-xs mt-1">{initialTimeDisplay} min</div>
                    <div className="text-[#00FFFF] text-xs">
                      {localTable.isActive ? "Time Remaining" : "Time Allotted"}
                    </div>
                  </div>
                </div>

                {/* Mobile Tab Navigation */}
                <div className="flex space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 text-sm ${
                      mobileTabView === "logs"
                        ? "bg-[#00FFFF] text-black border-[#00FFFF]"
                        : "border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"
                    }`}
                    onClick={() => setMobileTabView("logs")}
                  >
                    <FileTextIcon className="w-4 h-4 mr-1" />
                    Logs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 text-sm ${
                      mobileTabView === "menu"
                        ? "bg-[#FF00FF] text-white border-[#FF00FF]"
                        : "border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF]"
                    }`}
                    onClick={() => setMobileTabView("menu")}
                  >
                    <ServerIcon className="w-4 h-4 mr-1" />
                    Menu
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 text-sm ${
                      mobileTabView === "ai"
                        ? "bg-[#00FF00] text-black border-[#00FF00]"
                        : "border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-[#00FF00]"
                    }`}
                    onClick={() => setMobileTabView("ai")}
                  >
                    <BrainIcon className="w-4 h-4 mr-1" />
                    AI
                  </Button>
                </div>

                {/* Mobile Tab Content */}
                <div className="mt-4">
                  {mobileTabView === "logs" && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto p-2">
                      <h3 className="text-[#00FFFF] text-center mb-2 text-sm font-bold">Session Logs</h3>

                      {/* Action type filter */}
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`text-xs py-1 px-2 h-auto ${
                              logActionFilter === null
                                ? "bg-[#00FFFF] text-black border-[#00FFFF]"
                                : "border-[#00FFFF] bg-[#000033] text-[#00FFFF]"
                            }`}
                            onClick={() => setLogActionFilter(null)}
                          >
                            All
                          </Button>

                          {getUniqueActionTypes().map((action) => (
                            <Button
                              key={action}
                              variant="outline"
                              size="sm"
                              className={`text-xs py-1 px-2 h-auto ${
                                logActionFilter === action
                                  ? "bg-purple-600 text-white border-purple-600"
                                  : "border-purple-600/50 bg-[#000033] text-purple-300"
                              }`}
                              onClick={() => setLogActionFilter(action)}
                            >
                              {action}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Logs list */}
                      {logs &&
                      logs.filter(
                        (log) =>
                          log.tableId === table.id &&
                          table.sessionStartTime &&
                          log.timestamp >= table.sessionStartTime &&
                          (logActionFilter === null || log.action === logActionFilter),
                      ).length > 0 ? (
                        logs
                          .filter(
                            (log) =>
                              log.tableId === table.id &&
                              table.sessionStartTime &&
                              log.timestamp >= table.sessionStartTime &&
                              (logActionFilter === null || log.action === logActionFilter),
                          )
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .map((log) => (
                            <div key={log.id} className="p-2 border border-[#00FFFF]/30 rounded-md bg-[#000033] mb-2">
                              <div className="flex justify-between text-xs text-gray-400">
                                <span className="bg-purple-900/30 px-1 py-0.5 rounded text-purple-300">
                                  {log.action}
                                </span>
                                <span>
                                  {new Date(log.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {log.details && <div className="mt-1 text-sm text-[#00FFFF]">{log.details}</div>}
                            </div>
                          ))
                      ) : (
                        <div className="text-center text-gray-400 py-4">
                          <div className="mb-2 opacity-50">
                            <FileTextIcon className="h-8 w-8 mx-auto mb-1" />
                          </div>
                          {logActionFilter
                            ? `No "${logActionFilter}" logs available`
                            : "No session logs available for this table"}
                        </div>
                      )}
                    </div>
                  )}

                  {mobileTabView === "menu" && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto p-2">
                      <h3 className="text-[#FF00FF] text-center mb-2 text-sm font-bold">Menu Recommendations</h3>
                      <MenuRecommendations table={localTable} elapsedMinutes={Math.floor(elapsedTime / 60000)} />
                    </div>
                  )}

                  {mobileTabView === "ai" && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto p-2">
                      <h3 className="text-[#00FF00] text-center mb-2 text-sm font-bold">AI Insights</h3>
                      <div className="p-3 rounded-md border border-[#00FF00]/30 bg-[#001100]">
                        <p className="text-sm text-[#00FF00]">
                          {localTable.isActive
                            ? `Table ${localTable.name} has ${guestCount} guests and has been active for ${Math.floor(
                                elapsedTime / 60000,
                              )} minutes. ${
                                remainingTime < 0
                                  ? `Currently ${Math.abs(Math.floor(remainingTime / 60000))} minutes in overtime.`
                                  : `${Math.floor(remainingTime / 60000)} minutes remaining.`
                              }`
                            : `Table ${localTable.name} is currently inactive.`}
                        </p>
                        {localTable.server && (
                          <p className="text-sm mt-2 text-[#00FF00]">Server: {getServerName(localTable.server)}</p>
                        )}
                        {localTable.noteId && (
                          <p className="text-sm mt-2 text-[#00FF00]">
                            Note: {noteTemplates.find((n) => n.id === localTable.noteId)?.text || ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Desktop view - full functionality
              <div className="p-4 space-y-4">
                {/* Header with table name and status */}
                <div className="flex items-center justify-between">
                  <div className="text-[#00FFFF] text-xl font-bold">{localTable.name}</div>
                  <div className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs">
                    {localTable.isActive ? "Active" : "Inactive"}
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
                    onClick={() => isAuthenticated && hasPermission("canGroupTables") && setSelectedTab("group")}
                    disabled={!isAuthenticated || viewOnlyMode || !hasPermission("canGroupTables")}
                  >
                    Group
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
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-10 text-sm border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-[#00FF00] flex-1`}
                    onClick={() => setSelectedTab("manage")}
                  >
                    Manage
                  </Button>
                </div>

                {/* Content Area - Show either main content or selected tab */}
                {selectedTab === "manage" ? (
                  <>
                    {/* Timer Display with Play Button */}
                    <div className="flex items-center justify-between gap-4 mt-2">
                      <div className="flex-1 flex justify-center">
                        <div
                          className="p-3 rounded-md bg-[#000033] border border-[#00FFFF] inline-block"
                          style={{
                            boxShadow: "0 0 15px rgba(0, 255, 255, 0.5)",
                          }}
                        >
                          <div className="text-[#00FFFF] text-3xl font-bold">
                            {formatDisplayTime(displayedRemainingTime)}
                          </div>
                          <div className="text-[#00FFFF] text-xs mt-1">{initialTimeDisplay} min</div>
                          <div className="text-[#00FFFF] text-xs">
                            {localTable.isActive ? "Time Remaining" : "Time Allotted"}
                          </div>
                        </div>
                      </div>

                      {/* Play Button */}
                      <ActionButton />
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

                      {localTable.server && !editingServer ? (
                        // Show only the selected server with an edit button
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex-1 bg-[#00FF00] text-black text-center py-2 px-3 rounded-md font-bold">
                            {getServerName(localTable.server)}
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
                                const isSelected = currentServerRef.current === server.id
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
                                const isSelected = currentServerRef.current === server.id
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

                    {/* Recommendations Message - Only shown on manage tab */}
                    <div className="text-center text-[#00FFFF] text-sm mt-4">
                      {localTable.isActive ? (
                        <MenuRecommendations table={localTable} elapsedMinutes={Math.floor(elapsedTime / 60000)} />
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-[#00FFFF] text-xs">Recommendations will appear when session starts</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : selectedTab === "group" ? (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-center text-sm font-medium text-[#FF00FF]">
                      Select tables to merge into a group
                    </h3>

                    {/* Timer display - clickable to return to manage tab */}
                    <TimerDisplay />

                    {/* Action Button - available on all tabs */}
                    <div className="flex justify-center mb-4">
                      <ActionButton />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {allTables
                        .filter(
                          (t) => (!t.isActive || t.groupId === localTable.groupId) && t.name.toLowerCase() !== "system",
                        )
                        .sort((a, b) => {
                          // Extract numeric part from table names (e.g., "T1" -> 1)
                          const numA = Number.parseInt(a.name.replace(/\D/g, "")) || 0
                          const numB = Number.parseInt(b.name.replace(/\D/g, "")) || 0
                          return numA - numB
                        })
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
                ) : selectedTab === "move" ? (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-center text-sm font-medium text-[#00FFFF]">Select target table</h3>

                    {/* Timer display - clickable to return to manage tab */}
                    <TimerDisplay />

                    {/* Action Button - available on all tabs */}
                    <div className="flex justify-center mb-4">
                      <ActionButton />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {allTables
                        .filter((t) => t.id !== localTable.id && !t.isActive && t.name.toLowerCase() !== "system")
                        .sort((a, b) => {
                          // Extract numeric part from table names (e.g., "T1" -> 1)
                          const numA = Number.parseInt(a.name.replace(/\D/g, "")) || 0
                          const numB = Number.parseInt(b.name.replace(/\D/g, "")) || 0
                          return numA - numB
                        })
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
                    {allTables.filter((t) => t.id !== localTable.id && !t.isActive).length === 0 && (
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
                ) : selectedTab === "notes" ? (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-center text-sm font-medium text-[#FFFF00]">Select note template</h3>

                    {/* Timer display - clickable to return to manage tab */}
                    <TimerDisplay />

                    {/* Action Button - available on all tabs */}
                    <div className="flex justify-center mb-4">
                      <ActionButton />
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
                        <p className="text-[#FFFF00]">
                          {noteTemplates.find((n) => n.id === selectedNoteId)?.text || ""}
                        </p>
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
                ) : null}
              </div>
            )}

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
                    <span className="font-bold">{localTable.name}</span>?
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

  // If we're closing, return null
  return null
}

export { TableDialog }

// Forces mobile view mode with restricted functionality
// On mobile devices, only logs, menu recommendations, and AI insights are shown
// All editing capabilities are disabled on mobile to improve usability
