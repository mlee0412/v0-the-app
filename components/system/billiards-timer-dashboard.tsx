"use client";

import { useState, useEffect, useCallback, useReducer, useRef, useMemo } from "react";
import { debounce } from "lodash";
import { TableDialog } from "@/components/tables/table-dialog";
import { TableLogsDialog } from "@/components/tables/table-logs-dialog";
import { DayReportDialog } from "@/components/dialogs/day-report-dialog";
import { SettingsDialog } from "@/components/dialogs/settings-dialog";
import { UserManagementDialog } from "@/components/admin/user-management-dialog";
import { LoginDialog } from "@/components/auth/login-dialog";
import { useSupabaseData } from "@/hooks/use-supabase-data";
import { useAuth } from "@/contexts/auth-context";
import { PullUpInsightsPanel } from "@/components/system/pull-up-insights-panel";
import { SessionFeedbackDialog } from "@/components/dialogs/session-feedback-dialog";
import { Header } from "@/components/layout/header";
import { TableGrid } from "@/components/tables/table-grid";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { TouchLogin } from "@/components/auth/touch-login";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTableStore } from "@/utils/table-state-manager";
import { BigBangAnimation } from "@/components/animations/big-bang-animation";
import { ExplosionAnimation } from "@/components/animations/explosion-animation";
import { EnhancedMobileTableList } from "@/components/mobile/enhanced-mobile-table-list";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";
import { OfflineDetector } from "@/components/mobile/offline-detector";
import { OrientationAwareContainer } from "@/components/mobile/orientation-aware-container";
import { useMobile } from "@/hooks/use-mobile";
import { IOSTouchFix } from "@/components/ios-touch-fix";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { TableSessionLogs } from "@/components/mobile/table-session-logs";
import { FunctionsDashboard } from "@/components/system/functions-dashboard";
import { THRESHOLDS, BUSINESS_HOURS, DEFAULT_SESSION_TIME, TABLE_COUNT } from "@/constants";
import { useTableActions } from "@/hooks/use-table-actions";
import type { User as AuthUser } from "@/types/user";

export interface Table {
  id: number;
  name: string;
  isActive: boolean;
  startTime: number | null;
  remainingTime: number;
  initialTime: number;
  guestCount: number;
  server: string | null;
  groupId: string | null;
  hasNotes: boolean;
  noteId: string;
  noteText: string;
  updated_by_admin?: boolean;
  updated_by?: string | null;
  updatedAt: string;
  sessionStartTime?: number | null;
}

export interface Server {
  id: string;
  name: string;
  enabled: boolean;
}

export interface NoteTemplate {
  id: string;
  text: string;
}

export interface LogEntry {
  id: string;
  tableId: number;
  tableName: string;
  action: string;
  timestamp: number;
  details?: string;
}

// MODIFIED: SystemSettings interface to match database and intent
export interface SystemSettings {
  defaultSessionTime: number;
  warningThreshold: number;
  criticalThreshold: number;
  showTableCardAnimations: boolean; // UPDATED
  darkMode: boolean;
  soundEnabled: boolean; // Will be used by soundEffectsEnabled in DashboardState
  autoEndDay: boolean;
  autoEndDayTime: string;
  businessHours: { open: string; close: string };
  dayStarted: boolean;
  dayStartTime: number | null;
  // NEW: Add highContrastMode and largeTextMode if they are to be persisted
  highContrastMode?: boolean;
  largeTextMode?: boolean;
  // NEW: groupCounter from useSupabaseData will be handled separately
}

interface DashboardState {
  tables: Table[];
  servers: Server[];
  noteTemplates: NoteTemplate[];
  logs: LogEntry[];
  settings: SystemSettings; // This will hold our fetched and local UI settings
  selectedTable: Table | null;
  showLoginDialog: boolean;
  showUserManagementDialog: boolean;
  showSettingsDialog: boolean;
  showLogsDialog: boolean;
  showConfirmDialog: boolean;
  confirmMessage: string;
  confirmAction: (() => void) | null;
  notification: { message: string; type: "success" | "error" | "info" } | null;
  showTouchLogin: boolean;
  isFullScreen: boolean;
  showExitFullScreenConfirm: boolean;
  loginAttemptFailed: boolean;
  showFeedbackDialog: boolean;
  feedbackTable: Table | null;
  showDayReportDialog: boolean;
  isStartingDay: boolean;
  showBigBangAnimation: boolean;
  showExplosionAnimation: boolean;
  animationComplete: boolean;
  activeTab: "tables" | "logs" | "settings" | "servers" | "functions";
  // These will be controlled locally but can be initialized by settings.
  highContrastMode: boolean;
  largeTextMode: boolean;
  soundEffectsEnabled: boolean; // Renamed from settings.soundEnabled for clarity in UI
  hideSystemElements: boolean;
  showFunctionsDashboard: boolean;
  loginUsername: string;
  loginPassword: string;
  viewOnlyMode: boolean;
  // NEW: To store groupCounter from Supabase, separate from UI settings object
  groupCounter: number;
}

type DashboardAction =
  | { type: "SET_STATE"; payload: Partial<DashboardState> }
  | { type: "SET_TABLES"; payload: Table[] }
  | { type: "UPDATE_TABLE"; payload: Partial<Table> & { id: number } }
  | { type: "SET_NOTIFICATION"; message: string; notificationType: "success" | "error" | "info" }
  | { type: "CLEAR_NOTIFICATION" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<SystemSettings> } // MODIFIED: More generic settings update
  | { type: "SET_GROUP_COUNTER"; payload: number }; // NEW


const initialTables: Table[] = Array.from({ length: TABLE_COUNT }, (_, i) => ({
  id: i + 1,
  name: `T${i + 1}`,
  isActive: false,
  startTime: null,
  remainingTime: DEFAULT_SESSION_TIME,
  initialTime: DEFAULT_SESSION_TIME,
  guestCount: 0,
  server: null,
  groupId: null,
  hasNotes: false,
  noteId: "",
  noteText: "",
  updated_by_admin: false,
  updated_by: null,
  updatedAt: new Date().toISOString(),
}));

const initialState: DashboardState = {
  tables: initialTables,
  servers: [],
  noteTemplates: [],
  logs: [],
  settings: { // This is the local/initial state for settings
    defaultSessionTime: DEFAULT_SESSION_TIME,
    warningThreshold: THRESHOLDS.WARNING,
    criticalThreshold: THRESHOLDS.CRITICAL,
    showTableCardAnimations: true, // Default to true
    darkMode: true,
    soundEnabled: true,
    autoEndDay: false,
    autoEndDayTime: BUSINESS_HOURS.CLOSE,
    businessHours: { open: BUSINESS_HOURS.OPEN, close: BUSINESS_HOURS.CLOSE },
    dayStarted: false,
    dayStartTime: null,
    highContrastMode: false, // Initialize local UI toggles
    largeTextMode: false,   // Initialize local UI toggles
  },
  selectedTable: null,
  showLoginDialog: false,
  showUserManagementDialog: false,
  showSettingsDialog: false,
  showLogsDialog: false,
  showConfirmDialog: false,
  confirmMessage: "",
  confirmAction: null,
  notification: null,
  showTouchLogin: false,
  isFullScreen: false,
  showExitFullScreenConfirm: false,
  loginAttemptFailed: false,
  showFeedbackDialog: false,
  feedbackTable: null,
  showDayReportDialog: false,
  isStartingDay: false,
  showBigBangAnimation: false,
  showExplosionAnimation: false,
  animationComplete: true,
  activeTab: "tables",
  highContrastMode: false,    // Duplicates settings.highContrastMode for direct UI control
  largeTextMode: false,     // Duplicates settings.largeTextMode for direct UI control
  soundEffectsEnabled: true, // Duplicates settings.soundEnabled for direct UI control
  hideSystemElements: false,
  showFunctionsDashboard: false,
  loginUsername: "admin",
  loginPassword: "",
  viewOnlyMode: false,
  groupCounter: 1, // Initial local group counter
};

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload };
    case "SET_TABLES":
      return { ...state, tables: action.payload };
    case "UPDATE_TABLE":
      return {
        ...state,
        tables: state.tables.map((t) => (t.id === action.payload.id ? { ...t, ...action.payload } : t)),
      };
    case "SET_NOTIFICATION":
      return {
        ...state,
        notification: { message: action.message, type: action.notificationType },
      };
    case "CLEAR_NOTIFICATION":
      return { ...state, notification: null };
    case "UPDATE_SETTINGS": // MODIFIED: More generic settings update
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    case "SET_GROUP_COUNTER": // NEW
      return { ...state, groupCounter: action.payload };
    default:
      return state;
  }
};

export function BilliardsTimerDashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  const {
    tables,
    servers,
    noteTemplates: stateNoteTemplates,
    logs,
    settings,
    selectedTable,
    showLoginDialog,
    showUserManagementDialog,
    showSettingsDialog,
    showLogsDialog,
    showConfirmDialog,
    confirmMessage,
    confirmAction,
    notification,
    showTouchLogin,
    isFullScreen,
    showExitFullScreenConfirm,
    loginAttemptFailed,
    showFeedbackDialog,
    feedbackTable,
    showDayReportDialog,
    isStartingDay,
    showBigBangAnimation,
    showExplosionAnimation,
    animationComplete,
    activeTab,
    highContrastMode, // This is local state for UI toggle, potentially synced with settings.highContrastMode
    largeTextMode,   // This is local state for UI toggle
    soundEffectsEnabled, // This is local state for UI toggle, synced with settings.soundEnabled
    hideSystemElements,
    showFunctionsDashboard,
    loginUsername,
    loginPassword,
    viewOnlyMode,
    groupCounter, // NEW: use groupCounter from state
  } = state;

  const { isAuthenticated, isAdmin, isServer, currentUser, logout, hasPermission: authHasPermission } = useAuth();
  const isMobile = useMobile();
  const [currentTime, setCurrentTime] = useState(new Date());
  // Removed viewportHeight and headerHeight as they are not directly used for this change
  const headerRef = useRef<HTMLDivElement>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    dispatch({ type: "SET_STATE", payload: { hideSystemElements: isMobile } });
  }, [isMobile]);

  const {
    tables: supabaseTables,
    logs: supabaseLogs,
    servers: supabaseServerUsers,
    noteTemplates: supabaseNoteTemplates,
    dayStarted: supabaseDayStarted,
    showTableCardAnimations: supabaseShowTableCardAnimations, // NEW: Consumed from useSupabaseData
    groupCounter: supabaseGroupCounter,
    // systemSettings: supabaseSystemSettings, // Assuming useSupabaseData exposes the full settings object
    loading: supabaseLoading,
    error: supabaseError,
    updateTable: updateSupabaseTable,
    updateTables: updateSupabaseTables,
    addLogEntry: addSupabaseLogEntry,
    updateSystemSettings: updateSupabaseSystemSettings,
    updateServers: updateSupabaseServers,
    updateNoteTemplates: updateSupabaseNoteTemplates,
    syncData,
  } = useSupabaseData();

  // Effect to sync settings from Supabase to local dashboard state
  useEffect(() => {
    const newSettingsPayload: Partial<SystemSettings> = {};
    let changed = false;

    if (supabaseDayStarted !== undefined && supabaseDayStarted !== settings.dayStarted) {
      newSettingsPayload.dayStarted = supabaseDayStarted;
      changed = true;
    }
    if (supabaseShowTableCardAnimations !== undefined && supabaseShowTableCardAnimations !== settings.showTableCardAnimations) {
      newSettingsPayload.showTableCardAnimations = supabaseShowTableCardAnimations;
      changed = true;
    }
    // Example if other settings were fetched by useSupabaseData and exposed individually or via a systemSettings object
    // if (supabaseSystemSettings?.defaultSessionTime !== undefined && supabaseSystemSettings.defaultSessionTime !== settings.defaultSessionTime) {
    //   newSettingsPayload.defaultSessionTime = supabaseSystemSettings.defaultSessionTime;
    //   changed = true;
    // }
    // ... and so on for other settings like warningThreshold, criticalThreshold, darkMode, soundEnabled etc.

    if (changed) {
      dispatch({ type: "UPDATE_SETTINGS", payload: newSettingsPayload });
    }
    
    // Sync groupCounter separately
    if (supabaseGroupCounter !== undefined && supabaseGroupCounter !== groupCounter) {
      dispatch({ type: "SET_GROUP_COUNTER", payload: supabaseGroupCounter });
    }

  }, [
    supabaseDayStarted, 
    supabaseShowTableCardAnimations, 
    supabaseGroupCounter,
    // supabaseSystemSettings, // Add if you fetch the whole object
    settings, // Add full settings to ensure comparison is complete
    groupCounter
  ]);


  const formatCurrentTime = (date: Date) => date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const formatMinutes = (minutes: number) => Math.round(minutes);

  const queueTableUpdate = useCallback(
    (table: Table) => {
      updateSupabaseTable(table);
    },
    [updateSupabaseTable]
  );

  const debouncedUpdateTables = useCallback(
    debounce((tablesToUpdate: Table[]) => {
      if (tablesToUpdate.length > 0) {
        updateSupabaseTables(tablesToUpdate);
      }
    }, 500),
    [updateSupabaseTables]
  );

  const showNotification = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      dispatch({ type: "SET_NOTIFICATION", message, notificationType: type });
      notificationTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "CLEAR_NOTIFICATION" });
        notificationTimeoutRef.current = null;
      }, 3000);

      if (settings.soundEnabled && type !== "info") { 
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          oscillator.type = type === "success" ? "sine" : "square";
          oscillator.frequency.value = type === "success" ? 880 : 220;
          gainNode.gain.value = 0.1;
          oscillator.start();
          setTimeout(() => oscillator.stop(), type === "success" ? 200 : 400);
        } catch (error) {
          console.error("Failed to play notification sound:", error);
        }
      }
      if (isMobile && navigator.vibrate) {
        navigator.vibrate(type === "error" ? [100, 50, 100] : 50);
      }
    },
    [settings.soundEnabled, isMobile] 
  );
  
  const closeTableDialog = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { selectedTable: null } });
  }, []);

  const { startTableSession, endTableSession } = useTableActions({
    tables,
    dispatch,
    debouncedUpdateTable: queueTableUpdate,
    debouncedUpdateTables,
    addLogEntry: addSupabaseLogEntry, 
    showNotification,
    formatMinutes,
  });
  
  const handleStartSessionForDialog = useCallback(
    (tableId: number, currentGuestCount: number, currentServerId: string | null) => {
      startTableSession(tableId, currentGuestCount, currentServerId, closeTableDialog);
    },
    [startTableSession, closeTableDialog] 
  );

  const hasPermission = useCallback(
    (permission: string) => authHasPermission(permission),
    [authHasPermission]
  );

  const withPermission = useCallback(
    (permission: string, callback: () => void) => {
      if (!isAuthenticated || !hasPermission(permission)) {
        dispatch({ type: "SET_STATE", payload: { loginAttemptFailed: true } });
        showNotification("Admin login required for this action.", "error");
        return;
      }
      callback();
    },
    [isAuthenticated, hasPermission, showNotification]
  );

  useEffect(() => {
    if (supabaseTables) {
      dispatch({ type: "SET_TABLES", payload: supabaseTables });
      supabaseTables.forEach((table) => useTableStore.getState().refreshTable(table.id, table as any));
    }
  }, [supabaseTables]);

  useEffect(() => {
    if (supabaseLogs) {
      dispatch({ type: "SET_STATE", payload: { logs: supabaseLogs } });
    }
  }, [supabaseLogs]);

  useEffect(() => {
    if (supabaseServerUsers) {
      const uniqueServers = supabaseServerUsers.reduce((acc, server) => {
        if (!acc.some((s) => s.id === server.id)) acc.push(server);
        return acc;
      }, [] as Server[]);
      dispatch({ type: "SET_STATE", payload: { servers: uniqueServers } });
    }
  }, [supabaseServerUsers]);

  useEffect(() => {
    if (supabaseNoteTemplates) {
      dispatch({ type: "SET_STATE", payload: { noteTemplates: supabaseNoteTemplates } });
    }
  }, [supabaseNoteTemplates]);


  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      window.dispatchEvent(new CustomEvent("global-time-tick", { detail: { timestamp: now.getTime() } }));
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    const handleTableUpdatedEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ tableId: number; table: Table }>;
      const { tableId, table: updatedTableData } = customEvent.detail;
      dispatch({ type: "UPDATE_TABLE", payload: { id: tableId, ...updatedTableData } });
    };

    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullscreenElement || (document as any).msFullscreenElement);
      dispatch({ type: "SET_STATE", payload: { isFullScreen: isCurrentlyFullScreen, showExitFullScreenConfirm: false } });
    };

    window.addEventListener("table-updated", handleTableUpdatedEvent);
    window.addEventListener("fullscreenchange", handleFullScreenChange);
    window.addEventListener("webkitfullscreenchange", handleFullScreenChange);
    window.addEventListener("mozfullscreenchange", handleFullScreenChange);
    window.addEventListener("MSFullscreenChange", handleFullScreenChange);

    return () => {
      window.removeEventListener("table-updated", handleTableUpdatedEvent);
      window.removeEventListener("fullscreenchange", handleFullScreenChange);
      window.removeEventListener("webkitfullscreenchange", handleFullScreenChange);
      window.removeEventListener("mozfullscreenchange", handleFullScreenChange);
      window.removeEventListener("MSFullscreenChange", handleFullScreenChange);
    };
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (isFullScreen) {
      dispatch({ type: "SET_STATE", payload: { showExitFullScreenConfirm: true } });
      return;
    }
    const element = document.documentElement;
    const requestFullscreen = () =>
      element.requestFullscreen?.() ||
      (element as any).mozRequestFullScreen?.() ||
      (element as any).webkitRequestFullscreen?.() ||
      (element as any).msRequestFullscreen?.() ||
      Promise.reject("Fullscreen API not supported");
    requestFullscreen().catch((error) => {
      console.error("Fullscreen request failed:", error);
      showNotification("Fullscreen mode failed to activate", "error");
    });
  }, [isFullScreen, showNotification]);

  const confirmExitFullScreen = useCallback(() => {
    const exitFullscreen = () =>
      document.exitFullscreen?.() ||
      (document as any).mozCancelFullScreen?.() ||
      (document as any).webkitExitFullscreen?.() ||
      (document as any).msExitFullscreen?.() ||
      Promise.reject("Exit Fullscreen API not supported");
    exitFullscreen()
      .catch((error) => console.error("Exit fullscreen failed:", error))
      .finally(() => dispatch({ type: "SET_STATE", payload: { showExitFullScreenConfirm: false } }));
  }, []);

  const addLogEntry = useCallback(
    async (tableId: number, action: string, details = "") => {
      const table = tables.find((t) => t.id === tableId);
      const tableName = tableId === 0 ? "System" : table?.name || `Table ${tableId}`;
      await addSupabaseLogEntry(tableId, tableName, action, details);
    },
    [tables, addSupabaseLogEntry]
  );

  const openTableDialog = useCallback(
    (tableToOpen: Table) => {
      dispatch({ type: "SET_STATE", payload: { selectedTable: tableToOpen } });
    },
    []
  );

  const confirmEndSession = useCallback(
    (tableId: number) => {
      withPermission("canEndSession", () => {
        const tableToEnd = tables.find((t) => t.id === tableId);
        if (!tableToEnd) return;
        dispatch({
          type: "SET_STATE",
          payload: { feedbackTable: tableToEnd, showFeedbackDialog: true },
        });
      });
    },
    [tables, withPermission]
  );

  const handleSessionFeedback = useCallback(
    async (tableId: number, rating: "good" | "bad", comment: string) => {
      try {
        const tableForFeedback = tables.find((t) => t.id === tableId);
        if (!tableForFeedback) {
          showNotification("Table not found for feedback", "error");
          return;
        }
        const feedbackDetails = `Rating: ${rating}${comment ? `, Comment: ${comment}` : ""}`;
        await addLogEntry(tableId, "Session Feedback", feedbackDetails);
        await endTableSession(tableId, closeTableDialog); 
        dispatch({ type: "SET_STATE", payload: { feedbackTable: null, showFeedbackDialog: false } });
      } catch (error) {
        console.error("Failed to handle session feedback:", error);
        showNotification("Failed to submit feedback", "error");
      }
    },
    [tables, addLogEntry, endTableSession, showNotification, closeTableDialog]
  );

  const addTime = useCallback(
    async (tableId: number, minutes = 15) => {
      withPermission("canAddTime", async () => {
        try {
          const table = tables.find((t) => t.id === tableId);
          if (!table) {
            showNotification("Table not found", "error");
            return;
          }

          const additionalTime = minutes * 60 * 1000;
          const updatedAt = new Date().toISOString();
          
          if (table.groupId) {
            await addLogEntry(tableId, "Group Time Added", `${minutes} minutes added to group ${table.groupId}`);
            const updatedGroupTables = tables.map((t) => {
              if (t.groupId === table.groupId) {
                const newInitialTime = t.initialTime + additionalTime;
                const newRemainingTime = t.remainingTime + additionalTime; 
                return { 
                    ...t, 
                    initialTime: newInitialTime, 
                    remainingTime: newRemainingTime, 
                    updatedAt 
                };
              }
              return t;
            });
            dispatch({ type: "SET_TABLES", payload: updatedGroupTables });
            debouncedUpdateTables(updatedGroupTables.filter(t => t.groupId === table.groupId));
            showNotification(`Added ${minutes} minutes to ${table.groupId}`, "success");
          } else {
            const newInitialTime = table.initialTime + additionalTime;
            const newRemainingTime = table.remainingTime + additionalTime;
            const updatedTable = {
              ...table,
              initialTime: newInitialTime,
              remainingTime: newRemainingTime,
              updatedAt,
            };
            dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
            queueTableUpdate(updatedTable);
            await addLogEntry(tableId, "Time Added", `${minutes} minutes added`);
            showNotification(`Added ${minutes} minutes to ${table.name}`, "success");
          }
        } catch (error) {
          console.error("Failed to add time:", error);
          showNotification("Failed to add time", "error");
        }
      });
    },
    [tables, withPermission, addLogEntry, showNotification, queueTableUpdate, debouncedUpdateTables, dispatch]
  );
  
  const subtractTime = useCallback(
    async (tableId: number, minutes: number) => {
      withPermission("canSubtractTime", async () => {
        try {
          const table = tables.find((t) => t.id === tableId);
          if (!table) {
            showNotification("Table not found", "error");
            return;
          }
  
          const subtractedTime = minutes * 60 * 1000;
          const updatedAt = new Date().toISOString();

          if (table.groupId) {
            await addLogEntry(tableId, "Group Time Subtracted", `${minutes} minutes subtracted from group ${table.groupId}`);
            const updatedGroupTables = tables.map((t) => {
              if (t.groupId === table.groupId) {
                const newInitialTime = Math.max(0, t.initialTime - subtractedTime);
                const currentElapsedTime = t.isActive && t.startTime ? (Date.now() - t.startTime) : (t.initialTime - t.remainingTime);
                const newRemainingTime = newInitialTime - currentElapsedTime;
                return { 
                    ...t, 
                    initialTime: newInitialTime, 
                    remainingTime: newRemainingTime, 
                    updatedAt 
                };
              }
              return t;
            });
            dispatch({ type: "SET_TABLES", payload: updatedGroupTables });
            debouncedUpdateTables(updatedGroupTables.filter(t => t.groupId === table.groupId));
            showNotification(`Subtracted ${minutes} minutes from ${table.groupId}`, "info");
          } else {
            const newInitialTime = Math.max(0, table.initialTime - subtractedTime);
            const currentElapsedTime = table.isActive && table.startTime ? (Date.now() - table.startTime) : (table.initialTime - table.remainingTime);
            const newRemainingTime = newInitialTime - currentElapsedTime;
            const updatedTable = {
              ...table,
              initialTime: newInitialTime,
              remainingTime: newRemainingTime,
              updatedAt,
            };
            dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
            queueTableUpdate(updatedTable);
            await addLogEntry(tableId, "Time Subtracted", `${minutes} minutes subtracted`);
            showNotification(`Subtracted ${minutes} minutes from ${table.name}`, "info");
          }
        } catch (error) {
          console.error("Failed to subtract time:", error);
          showNotification("Failed to subtract time", "error");
        }
      });
    },
    [tables, withPermission, addLogEntry, showNotification, queueTableUpdate, debouncedUpdateTables, dispatch]
  );

  const updateGuestCount = useCallback(
    async (tableId: number, count: number) => {
      withPermission("canUpdateGuests", async () => {
        try {
          if (!settings.dayStarted) {
            showNotification("Please start the day before updating guest count", "error");
            return;
          }
          const table = tables.find((t) => t.id === tableId);
          if (!table) {
            showNotification("Table not found", "error");
            return;
          }
          const newCount = Math.max(0, Math.min(16, count));
          if (newCount !== table.guestCount) {
            await addLogEntry(tableId, "Players Updated", `Changed from ${table.guestCount} to ${newCount}`);
          }
          const updatedTable = { ...table, guestCount: newCount, updatedAt: new Date().toISOString() };
          dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
          queueTableUpdate(updatedTable);
        } catch (error) {
          console.error("Failed to update guest count:", error);
          showNotification("Failed to update guest count", "error");
        }
      });
    },
    [tables, settings.dayStarted, withPermission, addLogEntry, showNotification, queueTableUpdate, dispatch]
  );

  const assignServer = useCallback(
    async (tableId: number, serverId: string | null) => {
      if (!isAuthenticated) {
        showNotification("Please log in to assign servers.", "error");
        return;
      }
      if (!isAdmin && !hasPermission("canAssignServer") && !(isServer && currentUser?.id === serverId) ) {
        const currentTable = tables.find(t => t.id === tableId);
        if (!(isServer && currentUser?.id === serverId && (!currentTable?.server || currentTable?.server === currentUser?.id))) {
            showNotification("You do not have permission to assign this server.", "error");
            return;
        }
      }
      try {
        const table = tables.find((t) => t.id === tableId);
        if (!table) {
          showNotification(`Error: Table ${tableId} not found`, "error");
          return;
        }
        const updatedTable = { ...table, server: serverId || null, updatedAt: new Date().toISOString() };
        dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
        if (selectedTable?.id === tableId) {
          dispatch({ type: "SET_STATE", payload: { selectedTable: updatedTable } });
        }
        queueTableUpdate(updatedTable);
        const serverName = serverId ? servers.find((s) => s.id === serverId)?.name || "Unknown" : "Unassigned";
        await addLogEntry(tableId, "Server Assigned", `Server: ${serverName}`);
        showNotification(`Assigned ${serverName} to table ${tableId}`, "success");
      } catch (error) {
        console.error("Failed to assign server:", error);
        showNotification("Failed to assign server", "error");
      }
    },
    [tables, servers, isAuthenticated, isAdmin, isServer, currentUser, hasPermission, selectedTable, addLogEntry, showNotification, queueTableUpdate, dispatch]
  );

  const groupTables = useCallback(
    async (tableIds: number[]) => {
      withPermission("canGroupTables", async () => {
        try {
          if (tableIds.length < 2) {
            showNotification("Select at least two tables to group", "error");
            return;
          }
          // MODIFIED: Use groupCounter from DashboardState
          const newGroupCounter = groupCounter + 1;
          const groupName = `Group ${newGroupCounter}`;
          
          // Update Supabase settings with the new groupCounter and existing settings
          await updateSupabaseSystemSettings(
            settings.dayStarted,
            newGroupCounter, // Use the new group counter
            settings.showTableCardAnimations,
            settings.defaultSessionTime,
            settings.warningThreshold,
            settings.criticalThreshold
            // Add any other fields from your SystemSettings interface that updateSupabaseSystemSettings handles
          );
          // Update local state for groupCounter
          dispatch({ type: "SET_GROUP_COUNTER", payload: newGroupCounter });
          
          const tableNamesForLog = tableIds.map(id => tables.find(t => t.id === id)?.name || `T${id}`).join(", ");
          await addLogEntry(tableIds[0], "Tables Grouped", `Group: ${groupName}, Tables: ${tableNamesForLog}`);
          
          const activeContainedTables = tables.filter((t) => tableIds.includes(t.id) && t.isActive);
          const referenceTableForTiming = activeContainedTables.length > 0 ? activeContainedTables[0] : tables.find(t => t.id === tableIds[0]);

          const groupProps = referenceTableForTiming && referenceTableForTiming.isActive
            ? {
                isActive: true,
                startTime: referenceTableForTiming.startTime,
                initialTime: referenceTableForTiming.initialTime,
                remainingTime: referenceTableForTiming.remainingTime,
              }
            : {
                isActive: false,
                startTime: null,
                initialTime: DEFAULT_SESSION_TIME,
                remainingTime: DEFAULT_SESSION_TIME,
              };

          const updatedTablesArray = tables.map((table) =>
            tableIds.includes(table.id)
              ? { ...table, groupId: groupName, ...groupProps, updatedAt: new Date().toISOString() }
              : table
          );
          dispatch({ type: "SET_TABLES", payload: updatedTablesArray });
          debouncedUpdateTables(updatedTablesArray.filter(t => tableIds.includes(t.id)));
          showNotification(`Created ${groupName} with ${tableIds.length} tables`, "success");
        } catch (error) {
          console.error("Failed to group tables:", error);
          showNotification("Failed to group tables", "error");
        }
      });
    },
    // MODIFIED: Added groupCounter and settings to dependencies
    [tables, withPermission, groupCounter, settings, addLogEntry, showNotification, updateSupabaseSystemSettings, debouncedUpdateTables, dispatch]
  );

  const ungroupTable = useCallback(
    async (tableId: number) => {
      withPermission("canUngroupTable", async () => {
        try {
          const tableToUngroup = tables.find((t) => t.id === tableId);
          if (!tableToUngroup || !tableToUngroup.groupId) {
            showNotification(
              `Table ${tableToUngroup?.name || tableId} is not part of a group.`,
              "error"
            );
            return;
          }

          const groupIdentifier = tableToUngroup.groupId;
          await addLogEntry(
            tableId,
            "Table Ungrouped",
            `Table ${tableToUngroup.name} removed from group ${groupIdentifier}`
          );

          const updatedTable = {
            ...tableToUngroup,
            groupId: null,
            updatedAt: new Date().toISOString(),
          };

          dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
          queueTableUpdate(updatedTable);

          showNotification(
            `Table ${updatedTable.name} removed from group ${groupIdentifier}.`,
            "info"
          );
        } catch (error) {
          console.error("Failed to ungroup table:", error);
          showNotification("Failed to ungroup table", "error");
        }
      });
    },
    [tables, withPermission, addLogEntry, showNotification, queueTableUpdate, dispatch]
  );

  const ungroupSelectedTablesInDashboard = useCallback(
    async (tableIdsToUngroup: number[]) => {
        withPermission("canUngroupTable", async () => {
            try {
                if (tableIdsToUngroup.length === 0) {
                    showNotification("No tables selected to ungroup.", "info");
                    return;
                }

                const firstTableInSelection = tables.find(t => t.id === tableIdsToUngroup[0]);
                const groupIdentifier = firstTableInSelection?.groupId;

                await addLogEntry(
                    tableIdsToUngroup[0],
                    "Tables Ungrouped",
                    `Tables: ${tableIdsToUngroup.map(id => tables.find(t=>t.id === id)?.name || `T${id}`).join(", ")} from group ${groupIdentifier || 'Unknown'}`
                );

                const tablesToUpdateForSupabase: Table[] = [];
                const updatedTablesArray = tables.map((table) => {
                    if (tableIdsToUngroup.includes(table.id)) {
                        const ungroupedTable = {
                            ...table,
                            groupId: null,
                            updatedAt: new Date().toISOString()
                        };
                        tablesToUpdateForSupabase.push(ungroupedTable);
                        return ungroupedTable;
                    }
                    return table;
                });

                dispatch({ type: "SET_TABLES", payload: updatedTablesArray });
                if (tablesToUpdateForSupabase.length > 0) {
                    debouncedUpdateTables(tablesToUpdateForSupabase);
                }
                showNotification(`Ungrouped ${tableIdsToUngroup.length} table(s).`, "info");

            } catch (error) {
                console.error("Failed to ungroup tables:", error);
                showNotification("Failed to ungroup tables", "error");
            }
        });
    },
    [tables, withPermission, addLogEntry, showNotification, debouncedUpdateTables, dispatch]
  );


  const moveTable = useCallback(
    async (sourceId: number, targetId: number) => {
      withPermission("canMoveTable", async () => {
        try {
          const sourceTable = tables.find((t) => t.id === sourceId);
          const targetTable = tables.find((t) => t.id === targetId);
          if (!sourceTable || !targetTable) {
            showNotification("Source or target table not found", "error");
            return;
          }
          await addLogEntry(sourceId, "Table Moved", `From: ${sourceTable.name} to ${targetTable.name}`);
          const timestamp = new Date().toISOString();
          const updatedTargetTable = {
            ...targetTable,
            isActive: sourceTable.isActive,
            startTime: sourceTable.startTime,
            remainingTime: sourceTable.remainingTime,
            initialTime: sourceTable.initialTime,
            guestCount: sourceTable.guestCount,
            server: sourceTable.server,
            groupId: sourceTable.groupId,
            hasNotes: sourceTable.hasNotes,
            noteId: sourceTable.noteId,
            noteText: sourceTable.noteText,
            updatedAt: timestamp,
          };
          const resetSourceTable = {
            ...sourceTable,
            isActive: false, startTime: null, remainingTime: DEFAULT_SESSION_TIME,
            initialTime: DEFAULT_SESSION_TIME, guestCount: 0, server: null,
            groupId: null, hasNotes: false, noteId: "", noteText: "",
            updatedAt: timestamp,
          };
          const newTables = tables.map((t) =>
            t.id === sourceId ? resetSourceTable : t.id === targetId ? updatedTargetTable : t
          );
          dispatch({ type: "SET_TABLES", payload: newTables });
          queueTableUpdate(updatedTargetTable);
          queueTableUpdate(resetSourceTable);
          showNotification(`Moved data from ${sourceTable.name} to ${targetTable.name}`, "success");
        } catch (error) {
          console.error("Failed to move table:", error);
          showNotification("Failed to move table", "error");
        }
      });
    },
    [tables, withPermission, addLogEntry, showNotification, queueTableUpdate, dispatch]
  );

  const updateTableNotes = useCallback(
    async (tableId: number, noteId: string, noteText: string) => {
      try {
        const table = tables.find((t) => t.id === tableId);
        if (!table) {
          showNotification("Table not found", "error");
          return;
        }
        
        const hasNotesNow = noteId.trim().length > 0 || noteText.trim().length > 0;
        if (hasNotesNow && (!table.hasNotes || table.noteId !== noteId || table.noteText !== noteText)) {
            await addLogEntry(tableId, "Notes Updated", `Note: ${noteText.substring(0,30)}${noteText.length > 30 ? "..." : ""}`);
        } else if (table.hasNotes && !hasNotesNow) {
            await addLogEntry(tableId, "Notes Removed", "Note cleared");
        }

        const updatedTable = {
          ...table,
          noteId,
          noteText,
          hasNotes: hasNotesNow,
          updatedAt: new Date().toISOString(),
        };
        dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
        queueTableUpdate(updatedTable);
        if (hasNotesNow) showNotification("Note updated", "info");
        else if (table.hasNotes && !hasNotesNow) showNotification("Note removed", "info");

      } catch (error) {
        console.error("Failed to update notes:", error);
        showNotification("Failed to update notes", "error");
      }
    },
    [tables, addLogEntry, showNotification, queueTableUpdate, dispatch]
  );

  const getServerName = useCallback(
    (serverId: string | null) => {
      if (!serverId) return "Unassigned";
      const server = servers.find((s) => s.id === serverId);
      return server ? server.name : "Unknown";
    },
    [servers]
  );

  const startDay = useCallback(() => {
    if (!isAdmin) {
      showNotification("Admin login required to start the day.", "error");
      return;
    }
    dispatch({ type: "SET_STATE", payload: { animationComplete: false, showDayReportDialog: false, isStartingDay: true, showBigBangAnimation: true } });
  }, [isAdmin, showNotification]);

  const completeBigBangAnimation = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showBigBangAnimation: false, animationComplete: true, showDayReportDialog: true } });
  }, []);

  const endDay = useCallback(() => {
    if (!isAdmin) {
      showNotification("Admin login required to end the day.", "error");
      return;
    }
    dispatch({ type: "SET_STATE", payload: { showConfirmDialog: true, confirmMessage: "Are you sure you want to end the day? All active sessions will be ended.", confirmAction: () => dispatch({ type: "SET_STATE", payload: { animationComplete: false, showDayReportDialog: false, isStartingDay: false, showExplosionAnimation: true } }) } });
  }, [isAdmin, showNotification]);

  const completeExplosionAnimation = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showExplosionAnimation: false, animationComplete: true, showDayReportDialog: true } });
  }, []);

  const completeStartDay = useCallback(async () => {
    try {
      const resetTables = initialTables.map((table) => ({ ...table, updatedAt: new Date().toISOString() }));
      await updateSupabaseTables(resetTables);
      // Update Supabase settings with the new dayStarted status and existing animation setting
      await updateSupabaseSystemSettings(
        true, // dayStarted
        groupCounter, // Use current groupCounter from state
        settings.showTableCardAnimations, // Persist current animation setting
        settings.defaultSessionTime,
        settings.warningThreshold,
        settings.criticalThreshold
      );
      dispatch({ type: "SET_TABLES", payload: resetTables });
      resetTables.forEach((table) => useTableStore.getState().refreshTable(table.id, table as any));
      await addLogEntry(0, "Day Started", `Started at ${formatCurrentTime(new Date())}`);
      showNotification("Day started successfully", "success");
      dispatch({ type: "UPDATE_SETTINGS", payload: { dayStarted: true, dayStartTime: Date.now() } });
      dispatch({ type: "SET_STATE", payload: { isStartingDay: false } });
    } catch (error) {
      console.error("Failed to start day:", error);
      showNotification("Failed to start day", "error");
      dispatch({ type: "SET_STATE", payload: { isStartingDay: false } });
    }
  }, [settings, groupCounter, addLogEntry, showNotification, updateSupabaseTables, updateSupabaseSystemSettings, dispatch]);

  const completeEndDay = useCallback(async () => {
    try {
      const activeTables = tables.filter((t) => t.isActive);
      if (activeTables.length > 0) {
        for (const table of activeTables) {
          await addLogEntry(table.id, "Session Force Ended", `Table ${table.name} was active at day end`);
        }
      }
      const resetTables = initialTables.map((table) => ({ ...table, updatedAt: new Date().toISOString() }));
      await updateSupabaseTables(resetTables);
      // Update Supabase settings with the new dayStarted status and existing animation setting
      await updateSupabaseSystemSettings(
        false, // dayStarted
        1,     // Reset groupCounter
        settings.showTableCardAnimations, // Persist current animation setting
        settings.defaultSessionTime,
        settings.warningThreshold,
        settings.criticalThreshold
      );
      dispatch({ type: "SET_TABLES", payload: resetTables });
      resetTables.forEach((table) => useTableStore.getState().refreshTable(table.id, table as any));
      await addLogEntry(0, "Day Ended", `Ended at ${formatCurrentTime(new Date())}`);
      showNotification("Day ended successfully", "info");
      dispatch({ type: "UPDATE_SETTINGS", payload: { dayStarted: false, dayStartTime: null } });
      dispatch({ type: "SET_GROUP_COUNTER", payload: 1 }); // Reset local group counter
    } catch (error) {
      console.error("Failed to end day:", error);
      showNotification("Failed to end day", "error");
    }
  }, [tables, settings, addLogEntry, showNotification, updateSupabaseTables, updateSupabaseSystemSettings, dispatch]);
  
  const handleLogout = useCallback(() => {
    logout();
    showNotification("Logged out successfully", "info");
    dispatch({ type: "SET_STATE", payload: { viewOnlyMode: false } });
  }, [logout, showNotification]);

  const handleTabChange = useCallback((tab: string) => {
    dispatch({ type: "SET_STATE", payload: { activeTab: tab as DashboardState['activeTab'] } });
  }, []);

  const handleAddSession = useCallback(() => {
    const availableTable = tables.find((t) => !t.isActive);
    if (availableTable) {
      dispatch({ type: "SET_STATE", payload: { selectedTable: availableTable } });
    } else {
      showNotification("No available tables found", "error");
    }
  }, [tables, showNotification]);

  const handleRefreshData = useCallback(async () => {
    try {
      await syncData();
      showNotification("Data refreshed successfully", "success");
    } catch (error) {
      console.error("Error refreshing data:", error);
      showNotification("Failed to refresh data", "error");
    }
  }, [syncData, showNotification]);

  const handleAdminLogin = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { loginUsername: "admin", loginPassword: "", showTouchLogin: true } });
  }, []);
  
  const handleViewerLogin = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { loginUsername: "", loginPassword: "", showTouchLogin: true, viewOnlyMode: true } });
  }, []);

  const exitViewOnlyMode = useCallback(() => {
    showNotification("Please log in with appropriate credentials to exit view-only mode.", "info");
    dispatch({ type: "SET_STATE", payload: { showLoginDialog: true } });
  }, [showNotification]);

  const applyHighContrastMode = useCallback((enabled: boolean) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: { highContrastMode: enabled } });
    document.documentElement.classList.toggle("high-contrast-mode", enabled);
  }, []);

  const applyLargeTextMode = useCallback((enabled: boolean) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: { largeTextMode: enabled } });
    document.documentElement.classList.toggle("large-text-mode", enabled);
  }, []);
  
  // MODIFIED: Renamed and updated logic for table card animations
  const applyShowTableCardAnimations = useCallback(
    async (enabled: boolean) => {
      dispatch({ type: "UPDATE_SETTINGS", payload: { showTableCardAnimations: enabled } });
      try {
        await updateSupabaseSystemSettings(
          settings.dayStarted,
          groupCounter, // Use groupCounter from state
          enabled,
          settings.defaultSessionTime,
          settings.warningThreshold,
          settings.criticalThreshold
          // Add other system settings as needed
        );
        showNotification(`Table card animations ${enabled ? "enabled" : "disabled"}.`, "info");
      } catch (error) {
        console.error("Failed to update animation setting in Supabase:", error);
        showNotification("Failed to save animation setting.", "error");
        dispatch({ type: "UPDATE_SETTINGS", payload: { showTableCardAnimations: !enabled } });
      }
    },
    [settings, groupCounter, updateSupabaseSystemSettings, showNotification]
  );

  const applySoundEffects = useCallback((enabled: boolean) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: { soundEnabled: enabled } });
    // NEW: Update the local soundEffectsEnabled state for immediate UI feedback if needed
    dispatch({ type: "SET_STATE", payload: { soundEffectsEnabled: enabled } });
  }, []);

  const handleLogin = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showLoginDialog: true } });
  }, []);

  const handleShowFunctions = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showFunctionsDashboard: true } });
  }, []);

  const memoizedTables = tables;
  const memoizedServers = servers;
  const memoizedLogs = logs;
  const memoizedNoteTemplates = stateNoteTemplates;


  const onDialogCloseForDayReport = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showDayReportDialog: false } });
    if (isStartingDay && !settings.dayStarted) {
      completeStartDay();
    } else if (!isStartingDay && settings.dayStarted) {
      completeEndDay();
    }
    dispatch({ type: "SET_STATE", payload: { isStartingDay: false } });
  }, [isStartingDay, settings.dayStarted, completeStartDay, completeEndDay]);

  if (supabaseLoading && tables.length === 0 && !initialTables.length) { 
      return (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 z-50">
              <div className="text-white text-xl animate-pulse">Loading Billiard Universe...</div>
          </div>
      );
  }

  if (supabaseError && !tables.length) { 
      return (
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 text-white p-4">
              <h2 className="text-2xl text-red-500 mb-4">Connection Error</h2>
              <p className="text-center mb-2">Could not connect to the live data stream.</p>
              <p className="text-center text-sm text-gray-400 mb-6">Please check your internet connection. Data displayed might be outdated.</p>
              <Button onClick={handleRefreshData} className="bg-blue-600 hover:bg-blue-700">Attempt Reconnect</Button>
          </div>
      );
  }


  return (
    <TooltipProvider>
      <div
        className={`container mx-auto p-2 min-h-screen max-h-screen flex flex-col space-theme font-mono cursor-spaceship overflow-hidden ${
          settings.highContrastMode ? "high-contrast-text" : "" // MODIFIED: Use settings.highContrastMode
        } ${settings.largeTextMode ? "large-text" : ""}`} // MODIFIED: Use settings.largeTextMode
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <IOSTouchFix />
        <OfflineDetector />
        {notification && (
          <div
            role="alert"
            className={`fixed top-4 right-4 z-[100] p-4 rounded-md shadow-lg animate-in fade-in slide-in-from-top-5 duration-300 ${
              notification.type === "success" ? "bg-green-600 text-white"
              : notification.type === "error" ? "bg-red-600 text-white"
              : "bg-blue-600 text-white"
            }`}
          >
            {notification.message}
          </div>
        )}
        {!isMobile && (
          <Header
            ref={headerRef}
            currentTime={currentTime}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            dayStarted={settings.dayStarted}
            hasPermission={hasPermission}
            onStartDay={startDay}
            onEndDay={endDay}
            onShowSettings={() => dispatch({ type: "SET_STATE", payload: { showSettingsDialog: true } })}
            onLogout={handleLogout}
            onLogin={handleLogin}
            onSync={handleRefreshData}
            onToggleFullScreen={toggleFullScreen}
            onShowFunctions={handleShowFunctions}
            tables={memoizedTables}
            logs={memoizedLogs}
            servers={memoizedServers}
            animationComplete={animationComplete}
            viewOnlyMode={viewOnlyMode}
            onExitViewOnly={exitViewOnlyMode}
            onAdminLogin={handleAdminLogin}
            onViewerLogin={handleViewerLogin}
          />
        )}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className={isMobile ? "overflow-y-auto flex-1 pb-16" : "overflow-hidden h-full"}>
            <OrientationAwareContainer>
              {isMobile && (
                <div className="flex flex-col h-screen">
                  <MobileHeader currentTime={currentTime} /> 
                  <main className="flex-1 overflow-hidden">
                    {activeTab === "tables" && (
                      <div className="h-full overflow-y-auto pb-16">
                        <EnhancedMobileTableList
                          tables={memoizedTables}
                          servers={memoizedServers}
                          logs={memoizedLogs}
                          onTableClick={(tableId) => { 
                            const tableToOpen = tables.find(t => t.id === tableId);
                            if (tableToOpen) openTableDialog(tableToOpen);
                          }}
                          onAddTime={addTime} 
                          onEndSession={confirmEndSession} 
                          canAddTime={hasPermission("canAddTime")} 
                          canEndSession={hasPermission("canEndSession")} 
                          onRefresh={handleRefreshData}
                           // NEW: Pass animation setting
                          showAnimations={settings.showTableCardAnimations}
                        />
                      </div>
                    )}
                    {activeTab === "logs" && (
                      <div className="h-full overflow-y-auto pb-16 p-2">
                        <TableSessionLogs logs={memoizedLogs} />
                      </div>
                    )}
                     {activeTab === "functions" && (
                       <div className="w-full p-4 h-full overflow-y-auto pb-16">
                         <FunctionsDashboard open={true} onClose={()=>{ handleTabChange("tables");}} /> 
                       </div>
                     )}
                  </main>
                  <MobileBottomNav
                    onTabChange={handleTabChange}
                    onAddSession={handleAddSession}
                    activeTab={activeTab}
                    dayStarted={settings.dayStarted}
                    isAdmin={isAdmin}
                    onStartDay={startDay}
                    onEndDay={endDay}
                    onShowSettings={() => dispatch({ type: "SET_STATE", payload: { showSettingsDialog: true } })}
                    onLogout={handleLogout}
                    onLogin={handleAdminLogin} 
                    isAuthenticated={isAuthenticated} 
                  />
                </div>
              )}
              {!isMobile && (
                <TableGrid
                  tables={memoizedTables}
                  servers={memoizedServers}
                  logs={memoizedLogs}
                  onTableClick={openTableDialog}
                  // NEW: Pass the animation setting
                  showAnimations={settings.showTableCardAnimations}
                />
              )}
            </OrientationAwareContainer>
          </div>
        </div>

        {selectedTable && (
          <TableDialog
            table={selectedTable}
            servers={memoizedServers}
            allTables={memoizedTables}
            noteTemplates={memoizedNoteTemplates}
            logs={memoizedLogs}
            onClose={closeTableDialog}
            onStartSession={handleStartSessionForDialog} 
            onEndSession={confirmEndSession}
            onAddTime={addTime}
            onSubtractTime={subtractTime}
            onUpdateGuestCount={updateGuestCount}
            onAssignServer={assignServer}
            onGroupTables={groupTables}
            onUngroupTable={ungroupTable}
            onUngroupSelectedTables={ungroupSelectedTablesInDashboard}
            onMoveTable={moveTable}
            onUpdateNotes={updateTableNotes}
            getServerName={getServerName}
            currentUser={currentUser as AuthUser | null} 
            hasPermission={hasPermission}
            viewOnlyMode={viewOnlyMode}
          />
        )}
        
        {feedbackTable && (
          <SessionFeedbackDialog
            open={showFeedbackDialog}
            onClose={() => dispatch({ type: "SET_STATE", payload: { showFeedbackDialog: false, feedbackTable: null } })}
            table={feedbackTable}
            onSubmitFeedback={handleSessionFeedback}
          />
        )}
        <ConfirmDialog
          open={showConfirmDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showConfirmDialog: false, confirmAction: null } })}
          onConfirm={() => {
            if (confirmAction) confirmAction();
            dispatch({ type: "SET_STATE", payload: { showConfirmDialog: false, confirmAction: null } });
          }}
          message={confirmMessage}
        />
        <ConfirmDialog
          open={showExitFullScreenConfirm}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showExitFullScreenConfirm: false } })}
          onConfirm={confirmExitFullScreen}
          message="Are you sure you want to exit full screen mode?"
        />
        <DayReportDialog
          open={showDayReportDialog}
          onClose={onDialogCloseForDayReport}
          tables={memoizedTables}
          logs={memoizedLogs}
          servers={memoizedServers}
          isStarting={isStartingDay}
          dayStartTime={settings.dayStartTime}
        />
        <SettingsDialog
          open={showSettingsDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showSettingsDialog: false } })}
          servers={memoizedServers}
          onUpdateServers={updateSupabaseServers}
          noteTemplates={memoizedNoteTemplates}
          onUpdateNoteTemplates={updateSupabaseNoteTemplates}
          onShowUserManagement={() => {
            dispatch({ type: "SET_STATE", payload: { showSettingsDialog: false, showUserManagementDialog: true } });
          }}
          onShowLogs={() => {
            dispatch({ type: "SET_STATE", payload: { showSettingsDialog: false, showLogsDialog: true } });
          }}
          onLogout={handleLogout}
          showAdminControls={isAuthenticated && settings.dayStarted}
          currentSettings={settings} // Pass the whole settings object
          // MODIFIED: onUpdateSettings now handles partial updates and persists them
          onUpdateSettings={ async (updatedSettingsPayload) => {
            const newSettings = { ...settings, ...updatedSettingsPayload };
            dispatch({ type: "UPDATE_SETTINGS", payload: updatedSettingsPayload });
            // Persist all relevant settings to Supabase
            // Ensure updateSupabaseSystemSettings can handle all these fields or adapt it
            try {
              await updateSupabaseSystemSettings(
                newSettings.dayStarted,
                groupCounter, // Use groupCounter from dashboard state
                newSettings.showTableCardAnimations,
                newSettings.defaultSessionTime,
                newSettings.warningThreshold,
                newSettings.criticalThreshold
                // Pass other relevant newSettings fields if your Supabase function handles them
              );
              // The showNotification call is now within specific handlers like applyShowTableCardAnimations
            } catch (error) {
              console.error("Failed to update system settings in Supabase:", error);
              showNotification("Failed to save settings to server.", "error");
              // Optionally revert local state if Supabase update fails by re-dispatching old settings
              dispatch({ type: "UPDATE_SETTINGS", payload: settings });
            }
          }}
          onApplyHighContrast={applyHighContrastMode}
          onApplyLargeText={applyLargeTextMode}
          onApplySoundEffects={applySoundEffects}
          onApplyShowTableCardAnimations={applyShowTableCardAnimations} // Pass the specific handler
          highContrastMode={settings.highContrastMode || false} // Use settings from state
          largeTextMode={settings.largeTextMode || false}     // Use settings from state
          soundEffectsEnabled={settings.soundEnabled} // Use settings from state
        />
        <TableLogsDialog
          open={showLogsDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showLogsDialog: false } })}
          logs={memoizedLogs}
        />
        <LoginDialog
          open={showLoginDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showLoginDialog: false, loginAttemptFailed: false } })}
          loginAttemptFailed={loginAttemptFailed}
          onLoginSuccess={() => { 
            dispatch({ type: "SET_STATE", payload: { showLoginDialog: false, loginAttemptFailed: false, viewOnlyMode: false } });
            showNotification("Login successful!", "success");
          }}
          onSetViewOnly={() => dispatch({ type: "SET_STATE", payload: { viewOnlyMode: true, showLoginDialog: false } })}
        />
        <UserManagementDialog
          open={showUserManagementDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showUserManagementDialog: false } })}
        />
        {/* MODIFIED: Use settings.showTableCardAnimations */}
        {settings.showTableCardAnimations && typeof window !== 'undefined' && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && (
            <>
                {showBigBangAnimation && <BigBangAnimation onComplete={completeBigBangAnimation} />}
                {showExplosionAnimation && <ExplosionAnimation onComplete={completeExplosionAnimation} />}
            </>
        )}
        <TouchLogin
          isOpen={showTouchLogin}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showTouchLogin: false } })}
          onLogin={(user) => { 
            dispatch({ type: "SET_STATE", payload: { showTouchLogin: false, viewOnlyMode: user.role === 'viewer' } });
            showNotification(`Logged in as ${user.name || 'user'}!`, "success");
          }}
        />
        {isAuthenticated && settings.dayStarted && !isMobile && (
          <PullUpInsightsPanel tables={memoizedTables} logs={memoizedLogs} servers={memoizedServers} />
        )}
        <FunctionsDashboard
          open={showFunctionsDashboard}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showFunctionsDashboard: false, activeTab: "tables" } })}
        />
      </div>
    </TooltipProvider>
  );
}
