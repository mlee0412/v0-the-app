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
  UnplugIcon, 
  Search, // Import Search icon
  X // Import X icon
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Table, Server, NoteTemplate, LogEntry } from "@/components/system/billiards-timer-dashboard"
import { useAuth } from "@/contexts/auth-context"
import type { User } from "@/types/user"; // Using User from types/user.ts
import { TooltipProvider } from "@/components/ui/tooltip"
import { NumberPad } from "@/components/auth/number-pad"
import { MenuRecommendations } from "@/components/system/menu-recommendations"
import { useMobile } from "@/hooks/use-mobile"
import { Input } from "@/components/ui/input" // Import Input
import { ScrollArea } from "@/components/ui/scroll-area" // Import ScrollArea

interface TableDialogProps {
  table: Table
  servers: Server[]
  allTables: Table[]
  noteTemplates: NoteTemplate[]
  logs: LogEntry[]
  onClose: () => void
  // MODIFIED: onStartSession now takes guestCount and serverId
  onStartSession: (tableId: number, guestCount: number, serverId: string | null) => void 
  onEndSession: (tableId: number) => void
  onAddTime: (tableId: number, minutes?: number) => void
  onSubtractTime: (tableId: number, minutes: number) => void
  onUpdateGuestCount: (tableId: number, count: number) => void
  onAssignServer: (tableId: number, serverId: string | null) => void
  onGroupTables: (tableIds: number[]) => void
  onUngroupTable: (tableId: number) => void 
  onUngroupSelectedTables: (tableIds: number[]) => void 
  onMoveTable: (sourceId: number, targetId: number) => void
  onUpdateNotes: (tableId: number, noteId: string, noteText: string) => void
  getServerName: (serverId: string | null) => string
  currentUser: User | null // Using User from types/user.ts
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
  onUngroupSelectedTables, 
  onMoveTable,
  onUpdateNotes,
  getServerName,
  currentUser,
  hasPermission,
  viewOnlyMode = false,
}: TableDialogProps) {
  const { isAdmin, isServer, isAuthenticated } = useAuth()
  const isMobile = useMobile()
  const [selectedTab, setSelectedTab] = useState<"manage" | "group" | "move" | "notes" | "logs">("manage")
  
  const getInitialSelectedTablesForGrouping = useCallback(() => {
    if (table.groupId) {
      return allTables.filter(t => t.groupId === table.groupId).map(t => t.id);
    }
    return [table.id];
  }, [table.id, table.groupId, allTables]);

  const [selectedTablesForGrouping, setSelectedTablesForGrouping] = useState<number[]>(getInitialSelectedTablesForGrouping());

  const [targetTableId, setTargetTableId] = useState<number | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string>(table.noteId || "")
  
  const [localTable, setLocalTable] = useState<Table>(table);

  const [displayedRemainingTime, setDisplayedRemainingTime] = useState(table.remainingTime);
  const [workingRemainingTime, setWorkingRemainingTime] = useState(table.remainingTime);
  const [currentDialogInitialTime, setCurrentDialogInitialTime] = useState(table.initialTime);

  const [guestCount, setGuestCount] = useState(table.guestCount); 
  const [isGuestCountUpdatingByDialog, setIsGuestCountUpdatingByDialog] = useState(false); 

  const [validationError, setValidationError] = useState<string | null>(null);
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [serverSelectionExpanded, setServerSelectionExpanded] = useState(!table.isActive);
  const [showTimeConfirmation, setShowTimeConfirmation] = useState(false);
  const [pendingTimeAction, setPendingTimeAction] = useState<{ type: "add" | "subtract"; minutes: number } | null>(null);
  
  const [elapsedTimeForInsights, setElapsedTimeForInsights] = useState(0);
  const [editingServer, setEditingServer] = useState(!table.server);
  const [mobileTabView, setMobileTabView] = useState<"logs" | "menu" | "ai">("logs");
  const [logActionFilter, setLogActionFilter] = useState<string | null>(null);
  const [serverSearchTerm, setServerSearchTerm] = useState<string>(""); // New state for server search

  const currentGuestCountRef = useRef(table.guestCount); 
  const currentServerRef = useRef(table.server);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const updateGuestCountRef = useRef<NodeJS.Timeout | null>(null); 
  const updateServerRef = useRef<NodeJS.Timeout | null>(null);
  const updateNotesRef = useRef<NodeJS.Timeout | null>(null); // Corrected initialization
  const touchInProgressRef = useRef(false);
  const prevTableIdRef = useRef<number | undefined>(table.id);


  const availableServers = useMemo(() => {
    return servers
      .filter((server) => server.enabled !== false)
      .filter((server, index, self) => index === self.findIndex((s) => s.id === server.id))
      .filter(server => server.name.toLowerCase().includes(serverSearchTerm.toLowerCase())); // Filter by search term
  }, [servers, serverSearchTerm]);

  const canManageTable = useMemo(
    () =>
      isAdmin ||
      (isServer && currentUser && (localTable.server === currentUser.id || !localTable.server)) ||
      hasPermission("canAssignServer"),
    [isAdmin, isServer, currentUser, localTable.server, hasPermission],
  );

  useEffect(() => {
    const isNewTableInstance = prevTableIdRef.current !== table.id;
    
    setLocalTable(table); 
    currentServerRef.current = table.server;
    setSelectedNoteId(table.noteId || "");

    if (isNewTableInstance) {
      prevTableIdRef.current = table.id;
      setDisplayedRemainingTime(table.remainingTime);
      setWorkingRemainingTime(table.remainingTime);
      setCurrentDialogInitialTime(table.initialTime);
      setPendingTimeAction(null);
      setSelectedTablesForGrouping(getInitialSelectedTablesForGrouping()); 
      
      setGuestCount(table.guestCount); 
      currentGuestCountRef.current = table.guestCount;
      setIsGuestCountUpdatingByDialog(false); 
    } else {
      if (!pendingTimeAction && !isGuestCountUpdatingByDialog) {
        setDisplayedRemainingTime(table.remainingTime);
        setWorkingRemainingTime(table.remainingTime);
        setCurrentDialogInitialTime(table.initialTime);
      }
      if (!isGuestCountUpdatingByDialog) {
        setGuestCount(table.guestCount);
        currentGuestCountRef.current = table.guestCount;
      } else {
        if (table.guestCount === guestCount) { 
          setIsGuestCountUpdatingByDialog(false); 
        }
      }
    }
    
    if (selectedTab === "group" && !isNewTableInstance) { 
       setSelectedTablesForGrouping(getInitialSelectedTablesForGrouping());
    }

  }, [table, pendingTimeAction, selectedTab, allTables, isGuestCountUpdatingByDialog, getInitialSelectedTablesForGrouping, guestCount]);


  useEffect(() => {
    setValidationError(null);
  }, [selectedTab]);

  useEffect(() => {
    if (table.isActive) {
      setServerSelectionExpanded(false);
    } else {
      setServerSelectionExpanded(true);
      setEditingServer(!table.server); 
    }
  }, [table.isActive, table.server]); 

  useEffect(() => {
    const handleGlobalTimeTick = (event: Event) => {
      const customEvent = event as CustomEvent<{ timestamp: number }>;
      const now = customEvent.detail.timestamp;
      if (localTable.isActive && localTable.startTime) {
        const newElapsedTime = now - localTable.startTime;
        setElapsedTimeForInsights(newElapsedTime);
        if (!pendingTimeAction) { 
          const newRemaining = localTable.initialTime - newElapsedTime;
          setDisplayedRemainingTime(newRemaining);
          setWorkingRemainingTime(newRemaining); 
        }
      } else if (!pendingTimeAction) { 
        setDisplayedRemainingTime(localTable.initialTime); 
        setWorkingRemainingTime(localTable.initialTime);
        setElapsedTimeForInsights(0);
      }
    };
    window.addEventListener("global-time-tick", handleGlobalTimeTick as EventListener);
    
    const now = Date.now();
    if (localTable.isActive && localTable.startTime) {
        const newElapsedTime = now - localTable.startTime;
        setElapsedTimeForInsights(newElapsedTime);
        if (!pendingTimeAction) {
            const newRemaining = localTable.initialTime - newElapsedTime;
            setDisplayedRemainingTime(newRemaining);
            setWorkingRemainingTime(newRemaining);
        }
    } else {
        setElapsedTimeForInsights(0);
        if (!pendingTimeAction) {
            setDisplayedRemainingTime(localTable.initialTime);
            setWorkingRemainingTime(localTable.initialTime);
        }
    }
    return () => {
      window.removeEventListener("global-time-tick", handleGlobalTimeTick as EventListener);
    };
  }, [localTable.isActive, localTable.startTime, localTable.initialTime, pendingTimeAction]);

  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      if (updateGuestCountRef.current) clearTimeout(updateGuestCountRef.current);
      if (updateServerRef.current) clearTimeout(updateServerRef.current);
      if (updateNotesRef.current) clearTimeout(updateNotesRef.current);
    };
  }, []);

  const formatRemainingTimeHHMMSS = useCallback((ms: number) => {
    const isNegative = ms < 0;
    const absoluteMs = Math.abs(ms);
    const totalSeconds = Math.floor(absoluteMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const sign = isNegative ? "-" : "";
    return `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);
  
  const formatDisplayTime = useCallback(
    (ms: number) => {
      if (!localTable.isActive && !pendingTimeAction) { 
        return formatRemainingTimeHHMMSS(currentDialogInitialTime);
      }
      return formatRemainingTimeHHMMSS(ms);
    },
    [localTable.isActive, currentDialogInitialTime, formatRemainingTimeHHMMSS, pendingTimeAction],
  );

  const formatElapsedTimeForDisplay = useCallback((ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    },[]);

  const formatStartTime = useCallback((startTime: number | null | undefined) => {
    if (!startTime) return "N/A";
    const date = new Date(startTime);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, []);

  const uniqueActionTypes = useMemo(() => {
    if (!logs) return [];
    const uniqueActions = new Set<string>();
    logs.forEach((log) => {
      // Ensure table.sessionStartTime exists before comparing
      if (log.tableId === table.id && table.startTime && log.timestamp >= table.startTime && log.action) {
        uniqueActions.add(log.action);
      }
    });
    return Array.from(uniqueActions).sort();
  }, [logs, table.id, table.startTime]); // Changed table.sessionStartTime to table.startTime

  const toggleTableSelectionForGrouping = useCallback((tableId: number) => {
    setSelectedTablesForGrouping((prev) => {
      const newSelection = prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId];
      if (table.groupId && newSelection.every(id => allTables.find(t => t.id === id)?.groupId !== table.groupId)) {
        if (!newSelection.includes(table.id)) return [table.id]; 
      }
      return newSelection;
    });
    setValidationError(null);
  }, [table.id, table.groupId, allTables]);

  const handleCreateGroup = useCallback(() => {
    if (selectedTablesForGrouping.length < 2) {
      setValidationError("Please select at least two tables to create a group");
      return;
    }
    try {
      onGroupTables(selectedTablesForGrouping);
      onClose(); 
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  }, [selectedTablesForGrouping, onGroupTables, onClose]);

  const handleUngroupSelected = useCallback(() => {
    if (!localTable.groupId) {
        setValidationError("This table is not part of any group to ungroup.");
        return;
    }
    const tablesToUngroup = selectedTablesForGrouping.filter(id => {
        const selectedTableInfo = allTables.find(t => t.id === id);
        return selectedTableInfo && selectedTableInfo.groupId === localTable.groupId;
    });

    if (tablesToUngroup.length === 0) {
        setValidationError("No tables selected from the current group to ungroup.");
        return;
    }
    try {
      onUngroupSelectedTables(tablesToUngroup);
      onClose();
    } catch (error) {
      console.error("Failed to ungroup tables:", error);
    }
  }, [localTable.groupId, selectedTablesForGrouping, allTables, onUngroupSelectedTables, onClose]);


  const handleMoveTable = useCallback(() => {
    if (!targetTableId) {
      setValidationError("Please select a target table");
      return;
    }
    try {
      onMoveTable(table.id, targetTableId);
      onClose();
    } catch (error) {
      console.error("Failed to move table:", error);
    }
  }, [targetTableId, table.id, onMoveTable, onClose]);

  const handleNoteSelection = useCallback(
    (noteId: string) => {
      if (updateNotesRef.current) clearTimeout(updateNotesRef.current);
      setSelectedNoteId(noteId);
      let noteText = "";
      if (noteId) {
        const selectedTemplate = noteTemplates.find((t) => t.id === noteId);
        if (selectedTemplate) noteText = selectedTemplate.text;
      }
      setLocalTable((prev) => ({ ...prev, noteId, noteText, hasNotes: !!noteId }));
      window.dispatchEvent(
        new CustomEvent("local-table-update", {
          detail: { tableId: table.id, field: "notes", value: { noteId, noteText, hasNotes: !!noteId } },
        }),
      );
      updateNotesRef.current = setTimeout(() => {
        try {
          onUpdateNotes(table.id, noteId, noteText);
        } catch (error) {
          console.error("Failed to update notes:", error);
        }
      }, 300);
    },
    [table.id, noteTemplates, onUpdateNotes],
  );

  const toggleServerEditMode = useCallback(() => {
    setEditingServer((prevEditingServer) => {
        const nextEditingServer = !prevEditingServer;
        if (nextEditingServer) { 
            setServerSelectionExpanded(true);
        }
        return nextEditingServer;
    });
  }, []); 

  const handleServerSelection = useCallback(
    (serverId: string) => {
      if (touchInProgressRef.current) return;
      touchInProgressRef.current = true;
      if (updateServerRef.current) clearTimeout(updateServerRef.current);
      currentServerRef.current = serverId;
      setLocalTable((prev) => ({ ...prev, server: serverId }));
      setEditingServer(false); 
      setServerSelectionExpanded(false); 
      setValidationError(null);
      window.dispatchEvent(
        new CustomEvent("local-table-update", {
          detail: { tableId: table.id, field: "server", value: serverId },
        }),
      );
      updateServerRef.current = setTimeout(() => {
        try {
          onAssignServer(table.id, serverId);
        } catch (error) {
          console.error("Failed to assign server:", error);
        }
      }, 300);
      setTimeout(() => { touchInProgressRef.current = false }, 100);
    },
    [table.id, onAssignServer],
  );

  const handleAddTime = useCallback(
    (minutes: number) => {
      if (touchInProgressRef.current) return;
      touchInProgressRef.current = true;
      
      const additionalMs = minutes * 60 * 1000;
      const optimisticRemainingTime = workingRemainingTime + additionalMs;
      const optimisticInitialTime = currentDialogInitialTime + additionalMs;

      setDisplayedRemainingTime(optimisticRemainingTime); 
      setWorkingRemainingTime(optimisticRemainingTime);   
      setCurrentDialogInitialTime(optimisticInitialTime); 

      setPendingTimeAction({ type: "add", minutes });
      setShowTimeConfirmation(true);
      
      setTimeout(() => { touchInProgressRef.current = false }, 100);
    },
    [workingRemainingTime, currentDialogInitialTime],
  );

  const handleSubtractTime = useCallback(
    (minutes: number) => {
      if (touchInProgressRef.current) return;
      touchInProgressRef.current = true;

      const subtractedMs = minutes * 60 * 1000;
      const optimisticRemainingTime = workingRemainingTime - subtractedMs;
      const optimisticInitialTime = Math.max(0, currentDialogInitialTime - subtractedMs);

      setDisplayedRemainingTime(optimisticRemainingTime);
      setWorkingRemainingTime(optimisticRemainingTime);
      setCurrentDialogInitialTime(optimisticInitialTime);

      setPendingTimeAction({ type: "subtract", minutes });
      setShowTimeConfirmation(true);

      setTimeout(() => { touchInProgressRef.current = false }, 100);
    },
    [workingRemainingTime, currentDialogInitialTime],
  );
  
  const executeTimeChange = useCallback(() => {
    if (!pendingTimeAction) return;
    
    const finalConfirmedRemainingTime = workingRemainingTime;
    const finalConfirmedInitialTime = currentDialogInitialTime;
    
    setLocalTable((prevLocalTable) => ({
      ...prevLocalTable,
      remainingTime: finalConfirmedRemainingTime,
      initialTime: finalConfirmedInitialTime,
    }));
    setDisplayedRemainingTime(finalConfirmedRemainingTime);

    const actionType = pendingTimeAction.type;
    const actionMinutes = pendingTimeAction.minutes;
    
    setShowTimeConfirmation(false);
    setPendingTimeAction(null); 

    if (actionType === "add") {
      onAddTime(table.id, actionMinutes);
    } else {
      onSubtractTime(table.id, actionMinutes);
    }
  }, [pendingTimeAction, workingRemainingTime, currentDialogInitialTime, table.id, onAddTime, onSubtractTime]);

  const updateGuestCountOptimistically = useCallback((newCount: number) => {
    setIsGuestCountUpdatingByDialog(true); 

    currentGuestCountRef.current = newCount;
    setGuestCount(newCount); 
    setLocalTable((prev) => ({ ...prev, guestCount: newCount })); 

    window.dispatchEvent(
      new CustomEvent("local-table-update", {
        detail: { tableId: table.id, field: "guestCount", value: newCount },
      }),
    );

    if (updateGuestCountRef.current) clearTimeout(updateGuestCountRef.current);
    updateGuestCountRef.current = setTimeout(() => {
      try {
        onUpdateGuestCount(table.id, newCount); 
      } catch (error) {
        console.error("Failed to update guest count prop:", error);
      }
    }, 300);
    setValidationError(null);
  }, [table.id, onUpdateGuestCount]);


  const handleIncrementGuests = useCallback(() => {
    if (touchInProgressRef.current) return;
    touchInProgressRef.current = true;
    const newCount = Math.min(16, currentGuestCountRef.current + 1);
    updateGuestCountOptimistically(newCount);
    setTimeout(() => { touchInProgressRef.current = false }, 100);
  }, [updateGuestCountOptimistically]); 

  const handleDecrementGuests = useCallback(() => {
    if (touchInProgressRef.current) return;
    touchInProgressRef.current = true;
    const newCount = Math.max(0, currentGuestCountRef.current - 1);
    updateGuestCountOptimistically(newCount);
    setTimeout(() => { touchInProgressRef.current = false }, 100);
  }, [updateGuestCountOptimistically]);

  const handleNumberPadInput = useCallback(
    (value: string) => { // NumberPad now returns string
      const newCount = Math.min(16, Math.max(0, parseInt(value, 10) || 0));
      updateGuestCountOptimistically(newCount);
      setShowNumberPad(false);
    },
    [updateGuestCountOptimistically],
  );

  const handleGuestCountClick = useCallback(() => {
    if (touchInProgressRef.current) return;
    touchInProgressRef.current = true;
    setShowNumberPad(true);
    setTimeout(() => { touchInProgressRef.current = false }, 100);
  }, []);

  const handleEndSession = useCallback(() => {
    if (touchInProgressRef.current) return;
    touchInProgressRef.current = true;
    onEndSession(table.id); 
    // onClose will be handled by parent after feedback or directly
  }, [table.id, onEndSession]);

  const validateAndStartSession = useCallback(() => {
    if (guestCount <= 0) { 
      setValidationError("Please add at least one guest");
      setSelectedTab("manage");
      return false;
    }
    if (!localTable.server) {
      setValidationError("Please assign a server");
      setSelectedTab("manage");
      return false;
    }
    setValidationError(null);
    return true;
  }, [guestCount, localTable.server]); 

  const handleStartSessionClick = useCallback(() => {
    if (touchInProgressRef.current) return;
    touchInProgressRef.current = true;
    if (viewOnlyMode) {
      setValidationError("Cannot start session in view-only mode");
      setTimeout(() => { touchInProgressRef.current = false; }, 100);
      return;
    }
    if (!validateAndStartSession()) {
      setTimeout(() => { touchInProgressRef.current = false; }, 100);
      return;
    }
    // MODIFIED: Pass current guestCount and server from local dialog state
    onStartSession(localTable.id, guestCount, localTable.server);
    // onClose will be handled by parent (BilliardsTimerDashboard) after successful start
  }, [localTable, guestCount, localTable.server, viewOnlyMode, validateAndStartSession, onStartSession]); 

  const handleDialogClose = useCallback(() => {
    if (showTimeConfirmation) { 
        return; 
    }
    setDisplayedRemainingTime(table.remainingTime); 
    setWorkingRemainingTime(table.remainingTime);
    setCurrentDialogInitialTime(table.initialTime);
    setPendingTimeAction(null);

    setGuestCount(table.guestCount); 
    currentGuestCountRef.current = table.guestCount;
    // setLocalTable(table); // Avoid reverting optimistic updates if onClose is called prematurely
    setIsGuestCountUpdatingByDialog(false);
    
    setSelectedTab("manage");
    setValidationError(null);
    onClose();
  }, [table, onClose, showTimeConfirmation]); // Removed localTable from deps to avoid loop with its own updates


  const TimerDisplay = useCallback(
    () => (
      <div
        className="flex justify-center items-center mb-4 cursor-pointer"
        onClick={() => setSelectedTab("manage")}
        role="button"
        aria-label="Return to manage tab"
      >
        <div
          className="p-3 rounded-md bg-[#000033] border border-[#00FFFF]"
          style={{ boxShadow: "0 0 15px rgba(0, 255, 255, 0.5)" }}
        >
          <div className="text-[#00FFFF] text-3xl font-bold tabular-nums">{formatDisplayTime(displayedRemainingTime)}</div>
          <div className="text-[#00FFFF] text-xs mt-1">{Math.floor(currentDialogInitialTime / 60000)} min</div>
          <div className="text-[#00FFFF] text-xs">Time Allotted</div>
        </div>
      </div>
    ),
    [displayedRemainingTime, currentDialogInitialTime, formatDisplayTime, setSelectedTab],
  );

  const ActionButton = useCallback(
    () =>
      !localTable.isActive && hasPermission("canStartSession") ? (
        <Button
          size="sm" onClick={handleStartSessionClick}
          className="h-14 w-14 p-0 rounded-full bg-[#00FF33] hover:bg-[#00CC00] text-black transition-transform duration-200 hover:scale-110 active:scale-95"
          disabled={viewOnlyMode || !hasPermission("canStartSession")} aria-label="Start session"
        ><PlayIcon className="h-8 w-8" /></Button>
      ) : (
        localTable.isActive && (
          <Button
            size="sm" onClick={handleEndSession}
            className="h-14 w-14 p-0 rounded-full bg-[#FF3300] hover:bg-[#CC0000] text-white transition-transform duration-200 hover:scale-110 active:scale-95"
            disabled={viewOnlyMode || !hasPermission("canEndSession")} aria-label="End session"
          ><span className="text-lg font-bold">End</span></Button>
        )
      ),
    [localTable.isActive, hasPermission, handleStartSessionClick, handleEndSession, viewOnlyMode],
  );

  const canUngroup = useMemo(() => {
    if (!localTable.groupId) return false;
    return selectedTablesForGrouping.some(id => {
        const selectedTableInfo = allTables.find(t => t.id === id);
        return selectedTableInfo && selectedTableInfo.groupId === localTable.groupId;
    });
  }, [localTable.groupId, selectedTablesForGrouping, allTables]);


  return (
    <TooltipProvider>
      <Dialog open onOpenChange={ (openState) => { if (!openState) handleDialogClose(); } }>
        <DialogContent
          className="max-w-[500px] bg-[#000018] text-white border-[#00FFFF] animate-in fade-in-50 duration-300 space-theme font-mono cursor-galaga overflow-y-auto p-0"
          style={{ boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)", border: "2px solid #00FFFF" }}
          role="dialog"
          aria-labelledby="table-dialog-title"
          onInteractOutside={(e) => { if (showTimeConfirmation) e.preventDefault(); }}
        >
           {isMobile ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div id="table-dialog-title" className="text-[#00FFFF] text-xl font-bold">
                  {localTable.name}
                </div>
                <div className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs">
                  {localTable.isActive ? "Active" : "Inactive"}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <TimerDisplay />
              </div>
              <div className="flex space-x-2 mt-4">
                <Button
                  variant="outline" size="sm"
                  className={`flex-1 text-sm ${ mobileTabView === "logs" ? "bg-[#00FFFF] text-black border-[#00FFFF]" : "border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF]"}`}
                  onClick={() => setMobileTabView("logs")} aria-label="View logs"
                ><FileTextIcon className="w-4 h-4 mr-1" />Logs</Button>
                <Button
                  variant="outline" size="sm"
                  className={`flex-1 text-sm ${ mobileTabView === "menu" ? "bg-[#FF00FF] text-white border-[#FF00FF]" : "border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF]"}`}
                  onClick={() => setMobileTabView("menu")} aria-label="View menu recommendations"
                ><ServerIcon className="w-4 h-4 mr-1" />Menu</Button> {/* Changed Icon for Menu */}
                <Button
                  variant="outline" size="sm"
                  className={`flex-1 text-sm ${ mobileTabView === "ai" ? "bg-[#00FF00] text-black border-[#00FF00]" : "border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-[#00FF00]"}`}
                  onClick={() => setMobileTabView("ai")} aria-label="View AI insights"
                ><BrainIcon className="w-4 h-4 mr-1" />AI</Button>
              </div>
              <div className="mt-4">
                {mobileTabView === "logs" && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto p-2">
                    <h3 className="text-[#00FFFF] text-center mb-2 text-sm font-bold">Session Logs</h3>
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1 justify-center">
                        <Button variant="outline" size="sm" className={`text-xs py-1 px-2 h-auto ${ logActionFilter === null ? "bg-[#00FFFF] text-black border-[#00FFFF]" : "border-[#00FFFF] bg-[#000033] text-[#00FFFF]"}`} onClick={() => setLogActionFilter(null)} aria-label="Show all logs">All</Button>
                        {uniqueActionTypes.map((action) => (<Button key={action} variant="outline" size="sm" className={`text-xs py-1 px-2 h-auto ${ logActionFilter === action ? "bg-purple-600 text-white border-purple-600" : "border-purple-600/50 bg-[#000033] text-purple-300"}`} onClick={() => setLogActionFilter(action)} aria-label={`Filter by ${action}`}>{action}</Button>))}
                      </div>
                    </div>
                    {logs.filter((log) => log.tableId === table.id && table.startTime && log.timestamp >= table.startTime && (logActionFilter === null || log.action === logActionFilter)).sort((a, b) => b.timestamp - a.timestamp).map((log) => (
                        <div key={log.id} className="p-2 border border-[#00FFFF]/30 rounded-md bg-[#000033] mb-2" role="listitem">
                          <div className="flex justify-between text-xs text-gray-400"><span className="bg-purple-900/30 px-1 py-0.5 rounded text-purple-300">{log.action}</span><span>{new Date(log.timestamp).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</span></div>
                          {log.details && <div className="mt-1 text-sm text-[#00FFFF]">{log.details}</div>}
                        </div>
                    ))}
                    {logs.filter((log) => log.tableId === table.id && table.startTime && log.timestamp >= table.startTime && (logActionFilter === null || log.action === logActionFilter)).length === 0 && (<div className="text-center text-gray-400 py-4"><div className="mb-2 opacity-50"><FileTextIcon className="h-8 w-8 mx-auto mb-1" /></div>{logActionFilter ? `No "${logActionFilter}" logs available` : "No session logs available"}</div>)}
                  </div>
                )}
                {mobileTabView === "menu" && (<div className="space-y-2 max-h-[300px] overflow-y-auto p-2"><h3 className="text-[#FF00FF] text-center mb-2 text-sm font-bold">Menu Recommendations</h3><MenuRecommendations table={localTable} elapsedMinutes={Math.floor(elapsedTimeForInsights / 60000)} /></div>)}
                {mobileTabView === "ai" && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto p-2">
                    <h3 className="text-[#00FF00] text-center mb-2 text-sm font-bold">AI Insights</h3>
                    <div className="p-3 rounded-md border border-[#00FF00]/30 bg-[#001100]">
                      <p className="text-sm text-[#00FF00]">{localTable.isActive ? `Table ${localTable.name} has ${guestCount} guests and has been active for ${Math.floor(elapsedTimeForInsights / 60000)} minutes. ${ displayedRemainingTime < 0 ? `Currently ${Math.abs(Math.floor(displayedRemainingTime / 60000))} minutes in overtime.` : `${Math.floor(displayedRemainingTime / 60000)} minutes remaining.`}` : `Table ${localTable.name} is currently inactive.`}</p>
                      {localTable.server && (<p className="text-sm mt-2 text-[#00FF00]">Server: {getServerName(localTable.server)}</p>)}
                      {localTable.noteId && (<p className="text-sm mt-2 text-[#00FF00]">Note: {noteTemplates.find((n) => n.id === localTable.noteId)?.text || ""}</p>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div id="table-dialog-title" className="text-[#00FFFF] text-xl font-bold">{localTable.name}</div>
                <div className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs">{localTable.isActive ? "Active" : "Inactive"}</div>
              </div>
              {validationError && (<div className="bg-red-900/50 border border-red-500 text-white p-2 rounded-md text-sm" role="alert">{validationError}</div>)}
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className={`h-10 text-sm border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] flex-1 ${!isAuthenticated || viewOnlyMode || !hasPermission("canGroupTables") ? "opacity-50" : ""}`} onClick={() => isAuthenticated && hasPermission("canGroupTables") && setSelectedTab("group")} disabled={!isAuthenticated || viewOnlyMode || !hasPermission("canGroupTables")} aria-label="Group tables">Group</Button>
                <Button variant="outline" size="sm" className={`h-10 text-sm border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] flex-1 ${!isAuthenticated || viewOnlyMode || !hasPermission("canMoveTable") ? "opacity-50" : ""}`} onClick={() => isAuthenticated && hasPermission("canMoveTable") && setSelectedTab("move")} disabled={!isAuthenticated || viewOnlyMode || !hasPermission("canMoveTable")} aria-label="Move table">Move</Button>
                <Button variant="outline" size="sm" className={`h-10 text-sm border-[#FFFF00] bg-[#000033] hover:bg-[#000066] text-[#FFFF00] flex-1 ${!isAuthenticated || viewOnlyMode || !hasPermission("canUpdateNotes") ? "opacity-50" : ""}`} onClick={() => isAuthenticated && hasPermission("canUpdateNotes") && setSelectedTab("notes")} disabled={!isAuthenticated || viewOnlyMode || !hasPermission("canUpdateNotes")} aria-label="Manage notes">Notes</Button>
                <Button variant="outline" size="sm" className="h-10 text-sm border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] flex-1" onClick={() => setSelectedTab("logs")} aria-label="View logs"><FileTextIcon className="w-4 h-4 mr-1" />Logs</Button>
                <Button variant="outline" size="sm" className="h-10 text-sm border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-[#00FF00] flex-1" onClick={() => setSelectedTab("manage")} aria-label="Manage table">Manage</Button>
              </div>
              {selectedTab === "manage" ? (
                <>
                  <div className="flex items-center justify-between gap-4 mt-2"><div className="flex-1 flex justify-center"><TimerDisplay /></div><ActionButton /></div>
                  <div className="mt-4">
                    <div className="flex items-center justify-center mb-2"><UsersIcon className="mr-1 h-4 w-4 text-[#FF00FF]" /><h3 className="text-sm font-medium text-[#FF00FF]">Players</h3></div>
                    <div className="flex items-center justify-center gap-5">
                      <Button variant="outline" size="icon" className="h-12 w-12 border-2 border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] transition-all duration-200 active:scale-95 shadow-md" onClick={handleDecrementGuests} disabled={viewOnlyMode} aria-label="Decrease guest count"><MinusIcon className="h-6 w-6" /></Button>
                      <div className="text-3xl font-bold w-20 h-14 text-center text-[#FF00FF] cursor-pointer rounded-md flex items-center justify-center transition-all duration-200 relative bg-[#110022] active:scale-95" onClick={handleGuestCountClick} style={{boxShadow: "0 0 10px rgba(255, 0, 255, 0.5)", border: "2px solid rgba(255, 0, 255, 0.7)",}} role="button" aria-label="Edit guest count">{guestCount}<span className="absolute bottom-1 right-1 text-[8px] text-[#FF00FF] opacity-70">tap</span></div>
                      <Button variant="outline" size="icon" className="h-12 w-12 border-2 border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] transition-all duration-200 active:scale-95 shadow-md" onClick={handleIncrementGuests} disabled={viewOnlyMode} aria-label="Increase guest count"><PlusIcon className="h-6 w-6" /></Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-center mb-2"><ServerIcon className="mr-1 h-4 w-4 text-[#00FF00]" /><h3 className="text-sm font-medium text-[#00FF00]">Server</h3></div>
                    {localTable.server && !editingServer ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex-1 bg-[#00FF00] text-black text-center py-2 px-3 rounded-md font-bold">{getServerName(localTable.server)}</div>
                        <Button variant="outline" size="sm" className="border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-[#00FF00] active:scale-95" onClick={toggleServerEditMode} disabled={viewOnlyMode} aria-label="Edit server">Edit</Button>
                      </div>
                    ) 
                    : (
                      <div>
                        {/* Server Search Input */}
                        <div className="relative mb-2">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search server..."
                            value={serverSearchTerm}
                            onChange={(e) => setServerSearchTerm(e.target.value)}
                            className="bg-[#000033] border-[#00FFFF] text-white h-8 pl-8 text-xs"
                            disabled={viewOnlyMode}
                          />
                          {serverSearchTerm && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-white"
                              onClick={() => setServerSearchTerm("")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        {/* Scrollable Server List */}
                        <ScrollArea className="h-32 rounded-md border border-[#00FFFF]/30 p-2">
                          <div className="grid grid-cols-3 gap-2"> {/* Adjusted to 3 columns for better fit */}
                            {availableServers.length > 0 ? (
                              availableServers.map((server) => (
                                <Button 
                                  key={server.id} 
                                  variant={currentServerRef.current === server.id ? "default" : "outline"} 
                                  className={
                                    currentServerRef.current === server.id 
                                      ? "w-full justify-center bg-[#00FF00] hover:bg-[#00CC00] text-black text-xs h-7 px-1 touch-manipulation font-bold active:scale-95" 
                                      : "w-full justify-center border-2 border-[#00FF00] bg-[#000033] hover:bg-[#000066] text-white text-xs h-7 px-1 touch-manipulation active:scale-95"
                                  } 
                                  onClick={() => handleServerSelection(server.id)} 
                                  disabled={viewOnlyMode} 
                                  aria-label={`Select server ${server.name}`}
                                >
                                  <span className="truncate">{server.name}</span>
                                </Button>
                              ))
                            ) : (
                              <div className="col-span-3 text-center text-gray-400 text-xs py-4">No servers found</div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="space-y-2"><div className="flex items-center justify-center"><ClockIcon className="mr-1 h-4 w-4 text-[#00FFFF]" /><h3 className="text-sm font-medium text-[#00FFFF]">Add Time</h3></div><div className="grid grid-cols-2 gap-2">{[5, 15, 30, 60].map((min) => (<Button key={`add-${min}`} variant="outline" className="border-2 border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] transition-all duration-200 active:scale-95" onClick={() => handleAddTime(min)} disabled={viewOnlyMode || !hasPermission("canAddTime")} aria-label={`Add ${min} minutes`}>+{min} min</Button>))}</div></div>
                    <div className="space-y-2"><div className="flex items-center justify-center"><ArrowDownIcon className="mr-1 h-4 w-4 text-[#FFFF00]" /><h3 className="text-sm font-medium text-[#FFFF00]">Subtract Time</h3></div><div className="grid grid-cols-2 gap-2">{[5, 15, 30, 60].map((min) => (<Button key={`sub-${min}`} variant="outline" className="border-2 border-[#FFFF00] bg-[#000033] hover:bg-[#000066] text-[#FFFF00] transition-all duration-200 active:scale-95" onClick={() => handleSubtractTime(min)} disabled={viewOnlyMode || !hasPermission("canSubtractTime")} aria-label={`Subtract ${min} minutes`}>-{min} min</Button>))}</div></div>
                  </div>
                  <div className="text-center text-[#00FFFF] text-sm mt-4">{localTable.isActive ? (<MenuRecommendations table={localTable} elapsedMinutes={Math.floor(elapsedTimeForInsights / 60000)} />) : (<div className="p-4 text-center"><p className="text-[#00FFFF] text-xs">Recommendations will appear when session starts</p></div>)}</div>
                </>
              ) : selectedTab === "group" ? (
                <div className="mt-4 space-y-3">
                  <h3 className="text-center text-sm font-medium text-[#FF00FF]">Select tables for group actions</h3><TimerDisplay /><div className="flex justify-center mb-4"><ActionButton /></div>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-dashed border-purple-500/50 rounded-md">
                    {allTables.filter(t => t.name.toLowerCase() !== "system")
                        .sort((a, b) => (Number.parseInt(a.name.replace(/\D/g, "")) || 0) - (Number.parseInt(b.name.replace(/\D/g, "")) || 0))
                        .map((t) => {
                            const isSelected = selectedTablesForGrouping.includes(t.id);
                            const isPrimaryTableGroupMember = localTable.groupId && t.groupId === localTable.groupId;
                            const canSelect = !t.isActive || (t.isActive && t.groupId === localTable.groupId) || !t.groupId;

                            return (
                                <Button 
                                    key={t.id} 
                                    variant={isSelected ? "default" : "outline"} 
                                    className={`${isSelected ? "bg-[#FF00FF] text-white" : "border-[#FF00FF] text-[#FF00FF]"} 
                                                w-full active:scale-95 
                                                ${!canSelect && !isSelected ? "opacity-50 cursor-not-allowed" : ""}
                                                ${isPrimaryTableGroupMember && !isSelected ? "ring-2 ring-offset-1 ring-offset-black ring-purple-300" : ""}`}
                                    onClick={() => canSelect && toggleTableSelectionForGrouping(t.id)} 
                                    disabled={!canSelect && !isSelected}
                                    aria-label={`Select table ${t.name}`}
                                >
                                    {t.name} {t.groupId && <span className="text-xs opacity-70 ml-1">({t.groupId.replace("Group ","G")})</span>}
                                </Button>
                            );
                    })}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Button variant="outline" onClick={() => setSelectedTab("manage")} className="border-[#FF00FF] bg-[#000033] hover:bg-[#000066] text-[#FF00FF] active:scale-95" aria-label="Back to manage">Back</Button>
                    <div className="flex gap-2">
                        <Button className="bg-red-600 hover:bg-red-700 text-white active:scale-95 flex items-center" onClick={handleUngroupSelected} disabled={!canUngroup || viewOnlyMode || !hasPermission("canUngroupTable")} aria-label="Ungroup Selected Tables">
                            <UnplugIcon className="h-4 w-4 mr-1.5" /> Ungroup
                        </Button>
                        <Button className="bg-[#FF00FF] hover:bg-[#CC00CC] text-white active:scale-95" onClick={handleCreateGroup} disabled={selectedTablesForGrouping.length < 2 || viewOnlyMode || !hasPermission("canGroupTables")} aria-label="Create group">Create Group</Button>
                    </div>
                  </div>
                </div>
              ) : selectedTab === "move" ? (
                <div className="mt-4 space-y-3">
                  <h3 className="text-center text-sm font-medium text-[#00FFFF]">Select target table</h3><TimerDisplay /><div className="flex justify-center mb-4"><ActionButton /></div>
                  <div className="grid grid-cols-4 gap-2">{allTables.filter((t)=>t.id!==localTable.id&&!t.isActive&&t.name.toLowerCase()!=="system").sort((a,b)=>(Number.parseInt(a.name.replace(/\D/g,""))||0)-(Number.parseInt(b.name.replace(/\D/g,""))||0)).map((t)=>(<Button key={t.id} variant={targetTableId===t.id?"default":"outline"} className={targetTableId===t.id?"w-full bg-[#00FFFF] text-black active:scale-95":"w-full border-[#00FFFF] text-[#00FFFF] active:scale-95"} onClick={()=>setTargetTableId(t.id)} aria-label={`Select target table ${t.name}`}>{t.name}</Button>))}</div>
                  {allTables.filter((t)=>t.id!==localTable.id&&!t.isActive).length===0&&(<p className="text-center text-gray-400">No available target tables</p>)}
                  <div className="flex justify-between mt-4"><Button variant="outline" onClick={()=>setSelectedTab("manage")} className="border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] active:scale-95" aria-label="Back to manage">Back</Button><Button className="bg-[#00FFFF] hover:bg-[#00CCCC] text-black active:scale-95" onClick={handleMoveTable} disabled={!targetTableId || !hasPermission("canMoveTable")} aria-label="Move table data">Move Table Data</Button></div>
                </div>
              ) : selectedTab === "notes" ? (
                <div className="mt-4 space-y-3">
                  <h3 className="text-center text-sm font-medium text-[#FFFF00]">Select note template</h3><TimerDisplay /><div className="flex justify-center mb-4"><ActionButton /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant={selectedNoteId===""?"default":"outline"} className={selectedNoteId===""?"w-full bg-[#FFFF00] text-black active:scale-95":"w-full border-[#FFFF00] text-[#FFFF00] active:scale-95"} onClick={()=>handleNoteSelection("")} aria-label="Clear note">No Note</Button>
                    {noteTemplates.map((note)=>(<Button key={note.id} variant={selectedNoteId===note.id?"default":"outline"} className={selectedNoteId===note.id?"w-full bg-[#FFFF00] text-black active:scale-95":"w-full border-[#FFFF00] text-[#FFFF00] active:scale-95"} onClick={()=>handleNoteSelection(note.id)} aria-label={`Select note ${note.text}`}>{note.text.length>15?note.text.substring(0,15)+"...":note.text}</Button>))}
                  </div>
                  {selectedNoteId&&(<div className="p-2 bg-[#111100] rounded-md border border-[#FFFF00]/50"><p className="text-[#FFFF00]">{noteTemplates.find((n)=>n.id===selectedNoteId)?.text||""}</p></div>)}
                  <div className="flex justify-between mt-4"><Button variant="outline" onClick={()=>setSelectedTab("manage")} className="border-[#FFFF00] bg-[#000033] hover:bg-[#000066] text-[#FFFF00] active:scale-95" aria-label="Back to manage">Back</Button></div>
                </div>
              ) : selectedTab === "logs" ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto p-2 mt-4">
                  <h3 className="text-[#00FFFF] text-center mb-2 text-sm font-bold">Session Logs</h3>
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1 justify-center">
                      <Button variant="outline" size="sm" className={`text-xs py-1 px-2 h-auto ${ logActionFilter === null ? "bg-[#00FFFF] text-black border-[#00FFFF]" : "border-[#00FFFF] bg-[#000033] text-[#00FFFF]"}`} onClick={() => setLogActionFilter(null)} aria-label="Show all logs">All</Button>
                      {uniqueActionTypes.map((action) => (
                        <Button
                          key={action}
                          variant="outline"
                          size="sm"
                          className={`text-xs py-1 px-2 h-auto ${ logActionFilter === action ? "bg-purple-600 text-white border-purple-600" : "border-purple-600/50 bg-[#000033] text-purple-300"}`}
                          onClick={() => setLogActionFilter(action)}
                          aria-label={`Filter by ${action}`}
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {logs
                    .filter(
                      (log) =>
                        log.tableId === table.id &&
                        table.startTime &&
                        log.timestamp >= table.startTime &&
                        (logActionFilter === null || log.action === logActionFilter),
                    )
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((log) => (
                      <div key={log.id} className="p-2 border border-[#00FFFF]/30 rounded-md bg-[#000033] mb-2" role="listitem">
                        <div className="flex justify-between text-xs text-gray-400">
                          <span className="bg-purple-900/30 px-1 py-0.5 rounded text-purple-300">{log.action}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</span>
                        </div>
                        {log.details && <div className="mt-1 text-sm text-[#00FFFF]">{log.details}</div>}
                      </div>
                    ))}
                  {logs.filter((log) => log.tableId === table.id && table.startTime && log.timestamp >= table.startTime && (logActionFilter === null || log.action === logActionFilter)).length === 0 && (
                    <div className="text-center text-gray-400 py-4">
                      <div className="mb-2 opacity-50">
                        <FileTextIcon className="h-8 w-8 mx-auto mb-1" />
                      </div>
                      {logActionFilter ? `No "${logActionFilter}" logs available` : "No session logs available"}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
          <div className="p-4 border-t border-[#00FFFF]/30">
            <Button
              variant="outline"
              onClick={handleDialogClose}
              className="w-full border-[#00FFFF] bg-[#000033] hover:bg-[#000066] text-[#00FFFF] h-10 active:scale-95"
              aria-label="Close dialog"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {showNumberPad && (
        <NumberPad
          open={showNumberPad} // Prop to control dialog visibility
          onClose={() => setShowNumberPad(false)}
          onSubmit={(val) => handleNumberPadInput(val)} // Ensure NumberPad onSubmit returns string
          initialValue={String(guestCount)} // Pass as string
          maxLength={2} // Max 2 digits for guest count up to 16
          title="Enter Guest Count"
        />
      )}
      {showTimeConfirmation && pendingTimeAction && (
        <Dialog open={showTimeConfirmation} onOpenChange={(open) => {
            if (!open) { 
                setShowTimeConfirmation(false);
                setDisplayedRemainingTime(localTable.remainingTime); 
                setWorkingRemainingTime(localTable.remainingTime);
                setCurrentDialogInitialTime(localTable.initialTime);
                setPendingTimeAction(null);
            }
        }}>
          <DialogContent
            className="sm:max-w-[400px] bg-black text-white border-[#00FFFF] space-theme font-mono"
            style={{ backgroundImage: "linear-gradient(to bottom, #000033, #000011)", boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)"}}
            role="dialog" aria-labelledby="time-confirm-title"
            onInteractOutside={(e) => e.preventDefault()} 
          >
            <DialogHeader>
              <DialogTitle id="time-confirm-title" className="text-lg text-[#00FFFF] flex items-center justify-between">
                Confirm Time Change
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
                  New total time: <span className="font-bold tabular-nums">{formatRemainingTimeHHMMSS(displayedRemainingTime)}</span>
                </p>
                <p className="text-center text-white">
                  Are you sure you want to {pendingTimeAction.type === "add" ? "add" : "subtract"} time
                  {pendingTimeAction.type === "add" ? " to " : " from "}
                  <span className="font-bold">{localTable.name}</span>?
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                    setShowTimeConfirmation(false);
                    // Revert optimistic UI update on cancel
                    setDisplayedRemainingTime(table.remainingTime + (pendingTimeAction.type === "subtract" ? pendingTimeAction.minutes * 60000 : -pendingTimeAction.minutes * 60000) );
                    setWorkingRemainingTime(table.remainingTime + (pendingTimeAction.type === "subtract" ? pendingTimeAction.minutes * 60000 : -pendingTimeAction.minutes * 60000) );
                    setCurrentDialogInitialTime(table.initialTime + (pendingTimeAction.type === "subtract" ? pendingTimeAction.minutes * 60000 : -pendingTimeAction.minutes * 60000) );
                    setPendingTimeAction(null);
                }}
                className="border-gray-600 bg-[#000033] hover:bg-[#000066] text-white active:scale-95"
                aria-label="Cancel time change"
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
                aria-label="Confirm time change"
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
