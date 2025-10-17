"use client";

import React, { useState, useEffect, useCallback, useReducer, useRef, useMemo } from "react"; // Ensure React is imported
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
import { Header } from "@/components/layout/header";
import { TableGrid } from "@/components/tables/table-grid";
import { QuickStartDialog } from "@/components/dialogs/quick-start-dialog";
import { QuickNoteDialog } from "@/components/dialogs/quick-note-dialog";
import { StatusIndicatorDialog } from "@/components/dialogs/status-indicator-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { TouchLogin } from "@/components/auth/touch-login";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTableStore } from "@/utils/table-state-manager";
import dynamic from "next/dynamic";
const BigBangAnimation = dynamic(() => import("@/components/animations/big-bang-animation"), { ssr: false });
import { ExplosionAnimation } from "@/components/animations/explosion-animation";
import { EnhancedMobileTableList } from "@/components/mobile/enhanced-mobile-table-list";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";
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
  statusIndicators?: string[];
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

export interface SystemSettings {
  defaultSessionTime: number;
  warningThreshold: number;
  criticalThreshold: number;
  showTableCardAnimations: boolean;
  darkMode: boolean;
  soundEnabled: boolean;
  autoEndDay: boolean;
  autoEndDayTime: string;
  businessHours: { open: string; close: string };
  dayStarted: boolean;
  dayStartTime: number | null;
  highContrastMode?: boolean;
  largeTextMode?: boolean;
}

interface DashboardState {
  tables: Table[];
  servers: Server[];
  noteTemplates: NoteTemplate[];
  logs: LogEntry[];
  settings: SystemSettings;
  selectedTable: Table | null;
  showQuickStartDialog: boolean;
  showQuickNoteDialog: boolean;
  showStatusDialog: boolean;
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
  showDayReportDialog: boolean;
  isStartingDay: boolean;
  showBigBangAnimation: boolean;
  showExplosionAnimation: boolean;
  animationComplete: boolean;
  activeTab: "tables" | "logs" | "settings" | "servers" | "functions";
  highContrastMode: boolean;
  largeTextMode: boolean;
  soundEffectsEnabled: boolean;
  hideSystemElements: boolean; // This will be managed by isMobile after mount
  showFunctionsDashboard: boolean;
  loginUsername: string;
  loginPassword: string;
  viewOnlyMode: boolean;
  groupCounter: number;
}

type DashboardAction =
  | { type: "SET_STATE"; payload: Partial<DashboardState> }
  | { type: "SET_TABLES"; payload: Table[] }
  | { type: "UPDATE_TABLE"; payload: Partial<Table> & { id: number } }
  | { type: "SET_NOTIFICATION"; message: string; notificationType: "success" | "error" | "info" }
  | { type: "CLEAR_NOTIFICATION" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<SystemSettings> }
  | { type: "SET_GROUP_COUNTER"; payload: number };

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
  statusIndicators: [],
  updated_by_admin: false,
  updated_by: null,
  updatedAt: new Date().toISOString(),
}));

const initialState: DashboardState = {
  tables: initialTables,
  servers: [],
  noteTemplates: [],
  logs: [],
  settings: {
    defaultSessionTime: DEFAULT_SESSION_TIME,
    warningThreshold: THRESHOLDS.WARNING,
    criticalThreshold: THRESHOLDS.CRITICAL,
    showTableCardAnimations: true,
    darkMode: true,
    soundEnabled: true,
    autoEndDay: false,
    autoEndDayTime: BUSINESS_HOURS.CLOSE,
    businessHours: { open: BUSINESS_HOURS.OPEN, close: BUSINESS_HOURS.CLOSE },
    dayStarted: false,
    dayStartTime: null,
    highContrastMode: false,
    largeTextMode: false,
  },
  selectedTable: null,
  showQuickStartDialog: false,
  showQuickNoteDialog: false,
  showStatusDialog: false,
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
  showDayReportDialog: false,
  isStartingDay: false,
  showBigBangAnimation: false,
  showExplosionAnimation: false,
  animationComplete: true,
  activeTab: "tables",
  highContrastMode: false,
  largeTextMode: false,
  soundEffectsEnabled: true,
  hideSystemElements: false, // Initial state, will be updated by isMobile
  showFunctionsDashboard: false,
  loginUsername: "admin",
  loginPassword: "",
  viewOnlyMode: false,
  groupCounter: 1,
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
    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    case "SET_GROUP_COUNTER":
      return { ...state, groupCounter: action.payload };
    default:
      return state;
  }
};

export function BilliardsTimerDashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  
  // *** MODIFICATION: Mounted state for reliable client-side checks ***
  const [hasMounted, setHasMounted] = useState(false);
  const [isOldIpad, setIsOldIpad] = useState(false);
  const isMobile = useMobile(); // This hook should now return undefined initially

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    const ua = navigator.userAgent;
    // Broaden older iPad detection to include up to iPadOS 15
    const oldIpad = /iPad/.test(ua) && /OS 1[3-5]_/.test(ua);
    setIsOldIpad(oldIpad);
    if (oldIpad) {
      dispatch({ type: "UPDATE_SETTINGS", payload: { showTableCardAnimations: false } });
    }
  }, [hasMounted, dispatch]);

  const {
    tables, // This will be from dashboardReducer state
    // ... (all other state variables deconstructed from 'state')
    servers,
    noteTemplates: stateNoteTemplates,
    logs,
    settings,
    selectedTable,
    showQuickStartDialog,
    showQuickNoteDialog,
    showStatusDialog,
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
    showDayReportDialog,
    isStartingDay,
    showBigBangAnimation,
    showExplosionAnimation,
    animationComplete,
    activeTab,
    // highContrastMode, // Will use settings.highContrastMode
    // largeTextMode,   // Will use settings.largeTextMode
    // soundEffectsEnabled, // Will use settings.soundEnabled
    hideSystemElements, // This will be derived from isMobile after mount
    showFunctionsDashboard,
    loginUsername,
    loginPassword,
    viewOnlyMode,
    groupCounter,
  } = state;


  const { isAuthenticated, isAdmin, isServer, currentUser, logout, hasPermission: authHasPermission } = useAuth();
  const headerRef = useRef<HTMLDivElement>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationRef = useRef<{ message: string; time: number } | null>(null);

  // Memoized selectors for frequently used state slices
  const memoizedTables = useMemo(() => tables, [tables]);
  const memoizedServers = useMemo(() => servers, [servers]);
  const memoizedLogs = useMemo(() => logs, [logs]);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tableCardAnimations =
    settings.showTableCardAnimations && !isOldIpad && !prefersReducedMotion;

  // Update hideSystemElements based on isMobile, only after component has mounted
  useEffect(() => {
    if (hasMounted && isMobile !== undefined) {
        dispatch({ type: "SET_STATE", payload: { hideSystemElements: isMobile } });
    }
  }, [isMobile, hasMounted]);


  const {
    tables: supabaseTables,
    logs: supabaseLogs,
    servers: supabaseServerUsers,
    noteTemplates: supabaseNoteTemplates,
    dayStarted: supabaseDayStarted,
    showTableCardAnimations: supabaseShowTableCardAnimations,
    groupCounter: supabaseGroupCounter,
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
    
    if (changed) {
      dispatch({ type: "UPDATE_SETTINGS", payload: newSettingsPayload });
    }
    
    if (supabaseGroupCounter !== undefined && supabaseGroupCounter !== groupCounter) {
      dispatch({ type: "SET_GROUP_COUNTER", payload: supabaseGroupCounter });
    }

  }, [
    supabaseDayStarted, 
    supabaseShowTableCardAnimations, 
    supabaseGroupCounter,
    settings,
    groupCounter
  ]);

  const formatCurrentTime = (date: Date) => date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const formatMinutes = (minutes: number) => Math.round(minutes);

  const queueTableUpdate = useCallback(
    (table: Table) => {
      updateSupabaseTable(table as any); // Cast to any if Table type from Supabase is different
    },
    [updateSupabaseTable]
  );

  const debouncedUpdateTables = useCallback(
    debounce((tablesToUpdate: Table[]) => {
      if (tablesToUpdate.length > 0) {
        updateSupabaseTables(tablesToUpdate as any[]); // Cast if needed
      }
    }, 500),
    [updateSupabaseTables]
  );

  const showNotification = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      if (
        lastNotificationRef.current &&
        lastNotificationRef.current.message === message &&
        Date.now() - lastNotificationRef.current.time < 1000
      ) {
        return;
      }
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      dispatch({ type: "SET_NOTIFICATION", message, notificationType: type });
      notificationTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "CLEAR_NOTIFICATION" });
        notificationTimeoutRef.current = null;
      }, 3000);
      lastNotificationRef.current = { message, time: Date.now() };

      if (state.settings.soundEnabled && type !== "info") { // Use state.settings
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
      // Access isMobile via state if it's part of DashboardState, or directly if passed as prop/context
      if (state.hideSystemElements && navigator.vibrate) { // Assuming hideSystemElements implies mobile
        navigator.vibrate(type === "error" ? [100, 50, 100] : 50);
      }
    },
    [state.settings.soundEnabled, state.hideSystemElements] // Use state values
  );
  
  const closeTableDialog = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { selectedTable: null } });
  }, []);

  const {
    startTableSession,
    quickStartTableSession,
    endTableSession,
  } = useTableActions({
    tables: state.tables, // Use tables from state
    dispatch,
    debouncedUpdateTable: queueTableUpdate,
    debouncedUpdateTables,
    addLogEntry: addSupabaseLogEntry, 
    showNotification,
    formatMinutes,
  });
  
  const handleStartSessionForDialog = useCallback(
    (
      tableId: number,
      currentGuestCount: number,
      currentServerId: string | null,
    ) => {
      if (!state.settings.dayStarted) {
        showNotification(
          "Please start the day before starting a session",
          "error",
        );
        return;
      }
      startTableSession(
        tableId,
        currentGuestCount,
        currentServerId,
        closeTableDialog,
      );
    },
    [
      state.settings.dayStarted,
      startTableSession,
      closeTableDialog,
      showNotification,
    ],
  );

  const hasPermission = useCallback(
    (permissionKey: string) => authHasPermission(permissionKey), // Assuming permissionKey is keyof Permission
    [authHasPermission]
  );

  const withPermission = useCallback(
    (permissionKey: string, callback: () => void) => { // Assuming permissionKey is keyof Permission
      if (!isAuthenticated || !hasPermission(permissionKey)) {
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
      dispatch({ type: "SET_TABLES", payload: supabaseTables as Table[] }); // Cast if needed
      supabaseTables.forEach((table) => useTableStore.getState().refreshTable(table.id, table as any));
    }
  }, [supabaseTables]);

  useEffect(() => {
    if (supabaseLogs) {
      dispatch({ type: "SET_STATE", payload: { logs: supabaseLogs as LogEntry[] } }); // Cast if needed
    }
  }, [supabaseLogs]);

  useEffect(() => {
    if (supabaseServerUsers) {
      const uniqueServers = supabaseServerUsers.reduce((acc, server) => {
        if (!acc.some((s) => s.id === server.id)) acc.push(server);
        return acc;
      }, [] as Server[]);
      dispatch({ type: "SET_STATE", payload: { servers: uniqueServers as Server[] } }); // Cast
    }
  }, [supabaseServerUsers]);

  useEffect(() => {
    if (supabaseNoteTemplates) {
      dispatch({ type: "SET_STATE", payload: { noteTemplates: supabaseNoteTemplates as NoteTemplate[] } }); // Cast
    }
  }, [supabaseNoteTemplates]);

  useEffect(() => {
    const handleTableUpdatedEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ tableId: number; table: Partial<Table> }>; // Allow Partial<Table>
      const { tableId, table: updatedTableData } = customEvent.detail;
      dispatch({ type: "UPDATE_TABLE", payload: { id: tableId, ...updatedTableData } });
    };

    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullscreenElement || (document as any).msFullscreenElement);
      dispatch({ type: "SET_STATE", payload: { isFullScreen: isCurrentlyFullScreen, showExitFullScreenConfirm: false } });
    };

    window.addEventListener("table-updated", handleTableUpdatedEvent);
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullScreenChange);
    document.addEventListener("mozfullscreenchange", handleFullScreenChange);
    document.addEventListener("MSFullscreenChange", handleFullScreenChange);

    return () => {
      window.removeEventListener("table-updated", handleTableUpdatedEvent);
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullScreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullScreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullScreenChange);
    };
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (state.isFullScreen) { // Use state
      dispatch({ type: "SET_STATE", payload: { showExitFullScreenConfirm: true } });
      return;
    }
    // ... (rest of toggleFullScreen logic)
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
  }, [state.isFullScreen, showNotification]); // Use state

  const confirmExitFullScreen = useCallback(() => {
    // ... (confirmExitFullScreen logic)
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
      const currentTables = state.tables; // Use tables from state
      const table = currentTables.find((t) => t.id === tableId);
      const tableName = tableId === 0 ? "System" : table?.name || `Table ${tableId}`;
      await addSupabaseLogEntry(tableId, tableName, action, details);
    },
    [state.tables, addSupabaseLogEntry] // Use state
  );

  const openTableDialog = useCallback(
    (tableToOpen: Table) => {
      dispatch({ type: "SET_STATE", payload: { selectedTable: tableToOpen } });
    },
    []
  );

  const openQuickStartDialog = useCallback(
    (tableId: number) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return;
      dispatch({
        type: "SET_STATE",
        payload: { selectedTable: table, showQuickStartDialog: true },
      });
    },
    [state.tables]
  );

  const openQuickNoteDialog = useCallback(
    (tableId: number) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return;
      dispatch({
        type: "SET_STATE",
        payload: { selectedTable: table, showQuickNoteDialog: true },
      });
    },
    [state.tables]
  );

  const closeQuickNoteDialog = useCallback(() => {
    dispatch({
      type: "SET_STATE",
      payload: { selectedTable: null, showQuickNoteDialog: false },
    });
  }, []);

  const openStatusDialog = useCallback(
    (tableId: number) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return;
      dispatch({
        type: "SET_STATE",
        payload: { selectedTable: table, showStatusDialog: true },
      });
    },
    [state.tables]
  );

  const closeStatusDialog = useCallback(() => {
    dispatch({
      type: "SET_STATE",
      payload: { selectedTable: null, showStatusDialog: false },
    });
  }, []);

  const closeQuickStartDialog = useCallback(() => {
    dispatch({
      type: "SET_STATE",
      payload: { selectedTable: null, showQuickStartDialog: false },
    });
  }, []);

  const confirmEndSession = useCallback(
    (tableId: number) => {
      withPermission("canEndSession", () => { // Assuming this permission key is correct
        const currentTables = state.tables; // Use tables from state
        const tableToEnd = currentTables.find((t) => t.id === tableId);
        if (!tableToEnd) return;
        const targetLabel = tableToEnd.groupId ? tableToEnd.groupId : tableToEnd.name;
        dispatch({
          type: "SET_STATE",
          payload: {
            showConfirmDialog: true,
            confirmMessage: `End the session for ${targetLabel}?`,
            confirmAction: () => {
              void endTableSession(tableId, closeTableDialog);
            },
          },
        });
      });
    },
    [state.tables, withPermission, endTableSession, closeTableDialog] // Use state
  );

  const addTime = useCallback(
    async (tableId: number, minutes = 15) => {
      withPermission("canAddTime", async () => { // Assuming this permission key is correct
        try {
          const currentTables = state.tables; // Use tables from state
          const table = currentTables.find((t) => t.id === tableId);
          // ... (rest of addTime logic)
          if (!table) {
            showNotification("Table not found", "error");
            return;
          }
          const additionalTime = minutes * 60 * 1000;
          const updatedAt = new Date().toISOString();
          if (table.groupId) {
            await addLogEntry(tableId, "Group Time Added", `${minutes} minutes added to group ${table.groupId}`);
            const updatedGroupTables = currentTables.map((t) => {
              if (t.groupId === table.groupId) {
                const newInitialTime = t.initialTime + additionalTime;
                const newRemainingTime = t.remainingTime + additionalTime; 
                return { ...t, initialTime: newInitialTime, remainingTime: newRemainingTime, updatedAt };
              }
              return t;
            });
            dispatch({ type: "SET_TABLES", payload: updatedGroupTables });
            debouncedUpdateTables(updatedGroupTables.filter(t => t.groupId === table.groupId));
            showNotification(`Added ${minutes} minutes to ${table.groupId}`, "success");
          } else {
            // ... (logic for single table)
            const newInitialTime = table.initialTime + additionalTime;
            const newRemainingTime = table.remainingTime + additionalTime;
            const updatedTable = { ...table, initialTime: newInitialTime, remainingTime: newRemainingTime, updatedAt };
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
    [state.tables, withPermission, addLogEntry, showNotification, queueTableUpdate, debouncedUpdateTables, dispatch] // Use state
  );
  
  const subtractTime = useCallback(
    async (tableId: number, minutes: number) => {
      withPermission("canSubtractTime", async () => { // Assuming this permission key is correct
        try {
          const currentTables = state.tables; // Use tables from state
          const table = currentTables.find((t) => t.id === tableId);
          // ... (rest of subtractTime logic)
           if (!table) {
            showNotification("Table not found", "error");
            return;
          }
          const subtractedTime = minutes * 60 * 1000;
          const updatedAt = new Date().toISOString();
          if (table.groupId) {
            // ... (logic for group)
            await addLogEntry(tableId, "Group Time Subtracted", `${minutes} minutes subtracted from group ${table.groupId}`);
            const updatedGroupTables = currentTables.map((t) => {
              if (t.groupId === table.groupId) {
                const newInitialTime = Math.max(0, t.initialTime - subtractedTime);
                const currentElapsedTime = t.isActive && t.startTime ? (Date.now() - t.startTime) : (t.initialTime - t.remainingTime);
                const newRemainingTime = newInitialTime - currentElapsedTime;
                return { ...t, initialTime: newInitialTime, remainingTime: newRemainingTime, updatedAt };
              }
              return t;
            });
            dispatch({ type: "SET_TABLES", payload: updatedGroupTables });
            debouncedUpdateTables(updatedGroupTables.filter(t => t.groupId === table.groupId));
            showNotification(`Subtracted ${minutes} minutes from ${table.groupId}`, "info");
          } else {
            // ... (logic for single table)
            const newInitialTime = Math.max(0, table.initialTime - subtractedTime);
            const currentElapsedTime = table.isActive && table.startTime ? (Date.now() - table.startTime) : (table.initialTime - table.remainingTime);
            const newRemainingTime = newInitialTime - currentElapsedTime;
            const updatedTable = { ...table, initialTime: newInitialTime, remainingTime: newRemainingTime, updatedAt, };
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
    [state.tables, withPermission, addLogEntry, showNotification, queueTableUpdate, debouncedUpdateTables, dispatch] // Use state
  );

  const updateGuestCount = useCallback(
    async (tableId: number, count: number) => {
      withPermission("canUpdateGuests", async () => { // Assuming this permission key is correct
        try {
          const currentSettings = state.settings; // Use settings from state
          if (!currentSettings.dayStarted) {
            showNotification("Please start the day before updating guest count", "error");
            return;
          }
          const currentTables = state.tables; // Use tables from state
          const table = currentTables.find((t) => t.id === tableId);
          // ... (rest of updateGuestCount logic)
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
    [state.settings, state.tables, withPermission, addLogEntry, showNotification, queueTableUpdate, dispatch] // Use state
  );

  const assignServer = useCallback(
    async (tableId: number, serverId: string | null) => {
      if (!isAuthenticated) {
        showNotification("Please log in to assign servers.", "error");
        return;
      }
      // Assuming permission logic is correct
      if (!isAdmin && !hasPermission("canAssignServer") && !(isServer && currentUser?.id === serverId) ) {
        const currentTables = state.tables;
        const currentTable = currentTables.find(t => t.id === tableId);
        if (!(isServer && currentUser?.id === serverId && (!currentTable?.server || currentTable?.server === currentUser?.id))) {
            showNotification("You do not have permission to assign this server.", "error");
            return;
        }
      }
      try {
        const currentTables = state.tables; // Use state
        const currentServers = state.servers; // Use state
        const table = currentTables.find((t) => t.id === tableId);
        if (!table) {
          showNotification(`Error: Table ${tableId} not found`, "error");
          return;
        }
        const updatedTable = { ...table, server: serverId || null, updatedAt: new Date().toISOString() };
        dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
        if (state.selectedTable?.id === tableId) { // Use state
          dispatch({ type: "SET_STATE", payload: { selectedTable: updatedTable } });
        }
        queueTableUpdate(updatedTable);
        const serverName = serverId ? currentServers.find((s) => s.id === serverId)?.name || "Unknown" : "Unassigned";
        await addLogEntry(tableId, "Server Assigned", `Server: ${serverName}`);
        showNotification(`Assigned ${serverName} to table ${tableId}`, "success");
      } catch (error) {
        console.error("Failed to assign server:", error);
        showNotification("Failed to assign server", "error");
      }
    },
    [state.tables, state.servers, isAuthenticated, isAdmin, isServer, currentUser, hasPermission, state.selectedTable, addLogEntry, showNotification, queueTableUpdate, dispatch] // Use state
  );

  const groupTables = useCallback(
    async (tableIds: number[]) => {
      withPermission("canGroupTables", async () => { // Assuming permission key
        try {
          if (tableIds.length < 2) {
            showNotification("Select at least two tables to group", "error");
            return;
          }
          const currentGroupCounter = state.groupCounter; // Use state
          const newGroupCounter = currentGroupCounter + 1;
          const groupName = `Group ${newGroupCounter}`;
          
          const currentSettings = state.settings; // Use state
          await updateSupabaseSystemSettings(
            currentSettings.dayStarted,
            newGroupCounter,
            currentSettings.showTableCardAnimations,
            currentSettings.defaultSessionTime,
            currentSettings.warningThreshold,
            currentSettings.criticalThreshold
          );
          dispatch({ type: "SET_GROUP_COUNTER", payload: newGroupCounter });
          
          const currentTables = state.tables; // Use state
          const tableNamesForLog = tableIds.map(id => currentTables.find(t => t.id === id)?.name || `T${id}`).join(", ");
          await addLogEntry(tableIds[0], "Tables Grouped", `Group: ${groupName}, Tables: ${tableNamesForLog}`);
          
          const activeContainedTables = currentTables.filter((t) => tableIds.includes(t.id) && t.isActive);
          const referenceTableForTiming = activeContainedTables.length > 0 ? activeContainedTables[0] : currentTables.find(t => t.id === tableIds[0]);

          const groupProps = referenceTableForTiming && referenceTableForTiming.isActive
            ? { isActive: true, startTime: referenceTableForTiming.startTime, initialTime: referenceTableForTiming.initialTime, remainingTime: referenceTableForTiming.remainingTime, }
            : { isActive: false, startTime: null, initialTime: DEFAULT_SESSION_TIME, remainingTime: DEFAULT_SESSION_TIME, };

          const updatedTablesArray = currentTables.map((table) =>
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
    [state.tables, state.groupCounter, state.settings, withPermission, addLogEntry, showNotification, updateSupabaseSystemSettings, debouncedUpdateTables, dispatch] // Use state
  );

  const ungroupTable = useCallback(
    async (tableId: number) => {
      withPermission("canUngroupTable", async () => { // Assuming permission key
        try {
          const currentTables = state.tables; // Use state
          const tableToUngroup = currentTables.find((t) => t.id === tableId);
          // ... (rest of ungroupTable logic)
           if (!tableToUngroup || !tableToUngroup.groupId) {
            showNotification(`Table ${tableToUngroup?.name || tableId} is not part of a group.`, "error"); return;
          }
          const groupIdentifier = tableToUngroup.groupId;
          await addLogEntry(tableId, "Table Ungrouped", `Table ${tableToUngroup.name} removed from group ${groupIdentifier}`);
          const updatedTable = { ...tableToUngroup, groupId: null, updatedAt: new Date().toISOString(), };
          dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
          queueTableUpdate(updatedTable);
          showNotification(`Table ${updatedTable.name} removed from group ${groupIdentifier}.`, "info");

        } catch (error) {
          console.error("Failed to ungroup table:", error);
          showNotification("Failed to ungroup table", "error");
        }
      });
    },
    [state.tables, withPermission, addLogEntry, showNotification, queueTableUpdate, dispatch] // Use state
  );

  const ungroupSelectedTablesInDashboard = useCallback(
    async (tableIdsToUngroup: number[]) => {
        withPermission("canUngroupTable", async () => { // Assuming permission key
            try {
                if (tableIdsToUngroup.length === 0) {
                    showNotification("No tables selected to ungroup.", "info"); return;
                }
                const currentTables = state.tables; // Use state
                const firstTableInSelection = currentTables.find(t => t.id === tableIdsToUngroup[0]);
                const groupIdentifier = firstTableInSelection?.groupId;

                await addLogEntry(
                    tableIdsToUngroup[0],
                    "Tables Ungrouped",
                    `Tables: ${tableIdsToUngroup.map(id => currentTables.find(t=>t.id === id)?.name || `T${id}`).join(", ")} from group ${groupIdentifier || 'Unknown'}`
                );

                const tablesToUpdateForSupabase: Table[] = [];
                const updatedTablesArray = currentTables.map((table) => {
                    if (tableIdsToUngroup.includes(table.id)) {
                        const ungroupedTable = { ...table, groupId: null, updatedAt: new Date().toISOString() };
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
    [state.tables, withPermission, addLogEntry, showNotification, debouncedUpdateTables, dispatch] // Use state
  );


  const moveTable = useCallback(
    async (sourceId: number, targetId: number) => {
      withPermission("canMoveTable", async () => { // Assuming permission key
        try {
          const currentTables = state.tables; // Use state
          const sourceTable = currentTables.find((t) => t.id === sourceId);
          const targetTable = currentTables.find((t) => t.id === targetId);
          // ... (rest of moveTable logic)
          if (!sourceTable || !targetTable) {
            showNotification("Source or target table not found", "error"); return;
          }
          await addLogEntry(sourceId, "Table Moved", `From: ${sourceTable.name} to ${targetTable.name}`);
          const timestamp = new Date().toISOString();
          const updatedTargetTable = { ...targetTable, isActive: sourceTable.isActive, startTime: sourceTable.startTime, remainingTime: sourceTable.remainingTime, initialTime: sourceTable.initialTime, guestCount: sourceTable.guestCount, server: sourceTable.server, groupId: sourceTable.groupId, hasNotes: sourceTable.hasNotes, noteId: sourceTable.noteId, noteText: sourceTable.noteText, updatedAt: timestamp, };
          const resetSourceTable = { ...sourceTable, isActive: false, startTime: null, remainingTime: DEFAULT_SESSION_TIME, initialTime: DEFAULT_SESSION_TIME, guestCount: 0, server: null, groupId: null, hasNotes: false, noteId: "", noteText: "", updatedAt: timestamp, };
          const newTables = currentTables.map((t) => t.id === sourceId ? resetSourceTable : t.id === targetId ? updatedTargetTable : t );
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
    [state.tables, withPermission, addLogEntry, showNotification, queueTableUpdate, dispatch] // Use state
  );

  const updateTableNotes = useCallback(
    async (tableId: number, noteId: string, noteText: string) => {
      try {
        const currentTables = state.tables; // Use state
        const table = currentTables.find((t) => t.id === tableId);
        // ... (rest of updateTableNotes logic)
        if (!table) {
          showNotification("Table not found", "error"); return;
        }
        const hasNotesNow = noteId.trim().length > 0 || noteText.trim().length > 0;
        if (hasNotesNow && (!table.hasNotes || table.noteId !== noteId || table.noteText !== noteText)) {
            await addLogEntry(tableId, "Notes Updated", `Note: ${noteText.substring(0,30)}${noteText.length > 30 ? "..." : ""}`);
        } else if (table.hasNotes && !hasNotesNow) {
            await addLogEntry(tableId, "Notes Removed", "Note cleared");
        }
        const updatedTable = { ...table, noteId, noteText, hasNotes: hasNotesNow, updatedAt: new Date().toISOString(), };
        dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
        queueTableUpdate(updatedTable);
        if (hasNotesNow) showNotification("Note updated", "info");
        else if (table.hasNotes && !hasNotesNow) showNotification("Note removed", "info");

      } catch (error) {
        console.error("Failed to update notes:", error);
        showNotification("Failed to update notes", "error");
      }
    },
    [state.tables, addLogEntry, showNotification, queueTableUpdate, dispatch] // Use state
  );

  const handleQuickNoteSave = useCallback(
    (tableId: number, noteText: string) => {
      updateTableNotes(tableId, "", noteText)
      closeQuickNoteDialog()
    },
    [updateTableNotes, closeQuickNoteDialog]
  )

  const updateTableStatuses = useCallback(
    async (tableId: number, statuses: string[]) => {
      try {
        const table = state.tables.find((t) => t.id === tableId)
        if (!table) {
          showNotification("Table not found", "error")
          return
        }
        const updatedTable = { ...table, statusIndicators: statuses, updatedAt: new Date().toISOString() }
        dispatch({ type: "UPDATE_TABLE", payload: updatedTable })
        queueTableUpdate(updatedTable)
        await addLogEntry(tableId, "Status Updated", statuses.join(", "))
      } catch (error) {
        console.error("Failed to update status:", error)
        showNotification("Failed to update status", "error")
      }
    },
    [state.tables, addLogEntry, showNotification, queueTableUpdate, dispatch]
  )

  const getServerName = useCallback(
    (serverId: string | null) => {
      if (!serverId) return "Unassigned";
      const currentServers = state.servers; // Use state
      const server = currentServers.find((s) => s.id === serverId);
      return server ? server.name : "Unknown";
    },
    [state.servers] // Use state
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
      const currentSettings = state.settings; // Use state
      const currentGroupCounter = state.groupCounter; // Use state
      const resetTables = initialTables.map((table) => ({ ...table, updatedAt: new Date().toISOString() }));
      await updateSupabaseTables(resetTables as any[]); // Cast if needed
      await updateSupabaseSystemSettings(
        true, 
        currentGroupCounter, 
        currentSettings.showTableCardAnimations,
        currentSettings.defaultSessionTime,
        currentSettings.warningThreshold,
        currentSettings.criticalThreshold
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
  }, [state.settings, state.groupCounter, addLogEntry, showNotification, updateSupabaseTables, updateSupabaseSystemSettings, dispatch]); // Use state

  const completeEndDay = useCallback(async () => {
    try {
      const currentTables = state.tables; // Use state
      const currentSettings = state.settings; // Use state
      const activeTables = currentTables.filter((t) => t.isActive);
      if (activeTables.length > 0) {
        for (const table of activeTables) {
          await addLogEntry(table.id, "Session Force Ended", `Table ${table.name} was active at day end`);
        }
      }
      const resetTables = initialTables.map((table) => ({ ...table, updatedAt: new Date().toISOString() }));
      await updateSupabaseTables(resetTables as any[]); // Cast
      await updateSupabaseSystemSettings(
        false, 
        1,     
        currentSettings.showTableCardAnimations, 
        currentSettings.defaultSessionTime,
        currentSettings.warningThreshold,
        currentSettings.criticalThreshold
      );
      dispatch({ type: "SET_TABLES", payload: resetTables });
      resetTables.forEach((table) => useTableStore.getState().refreshTable(table.id, table as any));
      await addLogEntry(0, "Day Ended", `Ended at ${formatCurrentTime(new Date())}`);
      showNotification("Day ended successfully", "info");
      dispatch({ type: "UPDATE_SETTINGS", payload: { dayStarted: false, dayStartTime: null } });
      dispatch({ type: "SET_GROUP_COUNTER", payload: 1 });
    } catch (error) {
      console.error("Failed to end day:", error);
      showNotification("Failed to end day", "error");
    }
  }, [state.tables, state.settings, addLogEntry, showNotification, updateSupabaseTables, updateSupabaseSystemSettings, dispatch]); // Use state
  
  const handleLogout = useCallback(() => {
    logout();
    showNotification("Logged out successfully", "info");
    dispatch({ type: "SET_STATE", payload: { viewOnlyMode: false } });
  }, [logout, showNotification]);

  const handleTabChange = useCallback((tab: string) => {
    dispatch({ type: "SET_STATE", payload: { activeTab: tab as DashboardState['activeTab'] } });
  }, []);

  const handleAddSession = useCallback(() => {
    const currentTables = state.tables; // Use state
    const availableTable = currentTables.find((t) => !t.isActive);
    if (availableTable) {
      dispatch({ type: "SET_STATE", payload: { selectedTable: availableTable } });
    } else {
      showNotification("No available tables found", "error");
    }
  }, [state.tables, showNotification]); // Use state

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
    dispatch({ type: "SET_STATE", payload: { highContrastMode: enabled }}); // Update local UI state
    dispatch({ type: "UPDATE_SETTINGS", payload: { highContrastMode: enabled } }); // Update settings state
    document.documentElement.classList.toggle("high-contrast-mode", enabled);
  }, []);

  const applyLargeTextMode = useCallback((enabled: boolean) => {
    dispatch({ type: "SET_STATE", payload: { largeTextMode: enabled }}); // Update local UI state
    dispatch({ type: "UPDATE_SETTINGS", payload: { largeTextMode: enabled } }); // Update settings state
    document.documentElement.classList.toggle("large-text-mode", enabled);
  }, []);
  
  const applyShowTableCardAnimations = useCallback(
    async (enabled: boolean) => {
      const currentSettings = state.settings; // Use settings from state
      const currentGroupCounter = state.groupCounter; // Use groupCounter from state
      dispatch({ type: "UPDATE_SETTINGS", payload: { showTableCardAnimations: enabled } });
      try {
        await updateSupabaseSystemSettings(
          currentSettings.dayStarted,
          currentGroupCounter,
          enabled,
          currentSettings.defaultSessionTime,
          currentSettings.warningThreshold,
          currentSettings.criticalThreshold
        );
        showNotification(`Table card animations ${enabled ? "enabled" : "disabled"}.`, "info");
      } catch (error) {
        console.error("Failed to update animation setting in Supabase:", error);
        showNotification("Failed to save animation setting.", "error");
        dispatch({ type: "UPDATE_SETTINGS", payload: { showTableCardAnimations: !enabled } });
      }
    },
    [state.settings, state.groupCounter, updateSupabaseSystemSettings, showNotification, dispatch] // Use state
  );

  const applySoundEffects = useCallback((enabled: boolean) => {
    dispatch({ type: "SET_STATE", payload: { soundEffectsEnabled: enabled } }); // Update local UI state
    dispatch({ type: "UPDATE_SETTINGS", payload: { soundEnabled: enabled } }); // Update settings state
  }, []);

  const handleLogin = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showLoginDialog: true } });
  }, []);

  const handleShowFunctions = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { showFunctionsDashboard: true } });
  }, []);

  const onDialogCloseForDayReport = useCallback(() => {
    const currentSettings = state.settings; // Use state
    dispatch({ type: "SET_STATE", payload: { showDayReportDialog: false } });
    if (state.isStartingDay && !currentSettings.dayStarted) { // Use state
      completeStartDay();
    } else if (!state.isStartingDay && currentSettings.dayStarted) { // Use state
      completeEndDay();
    }
    dispatch({ type: "SET_STATE", payload: { isStartingDay: false } });
  }, [state.isStartingDay, state.settings.dayStarted, completeStartDay, completeEndDay, dispatch]); // Use state

  // *** MODIFICATION: Render loading or error state before hasMounted check ***
  if (supabaseLoading && tables.length === 0 && (!initialTables || initialTables.length === 0)) { 
      return (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 z-50">
              <div className="text-white text-xl animate-pulse">Loading Billiard Universe...</div>
          </div>
      );
  }

  if (supabaseError && tables.length === 0) { 
      return (
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 text-white p-4">
              <h2 className="text-2xl text-red-500 mb-4">Connection Error</h2>
              <p className="text-center mb-2">Could not connect to the live data stream.</p>
              <p className="text-center text-sm text-gray-400 mb-6">Please check your internet connection. Data displayed might be outdated.</p>
              <Button onClick={handleRefreshData} className="bg-blue-600 hover:bg-blue-700">Attempt Reconnect</Button>
          </div>
      );
  }
  
  // *** MODIFICATION: Return basic loader or null until hasMounted and isMobile are determined ***
  if (!hasMounted || isMobile === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-[9999]">
        <div className="text-foreground text-xl animate-pulse">Initializing Interface...</div>
      </div>
    ); // Or a more sophisticated skeleton/loader
  }

  // UI derived states based on DashboardState
  const currentHighContrastMode = state.settings.highContrastMode;
  const currentLargeTextMode = state.settings.largeTextMode;
  const currentSoundEffectsEnabled = state.settings.soundEnabled;

  return (
    <TooltipProvider>
      <div
        className={`container mx-auto p-2 min-h-screen max-h-screen flex flex-col space-theme font-mono cursor-spaceship overflow-hidden notch-aware ${
          currentHighContrastMode ? "high-contrast-text" : ""
        } ${currentLargeTextMode ? "large-text" : ""}`}
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}
      >
        <IOSTouchFix />
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
        {!hideSystemElements && ( // Use hideSystemElements from state
          <Header
            ref={headerRef}
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
            tables={tables} // Use tables from state
            logs={logs}     // Use logs from state
            servers={servers} // Use servers from state
            animationComplete={animationComplete}
            viewOnlyMode={viewOnlyMode}
            onExitViewOnly={exitViewOnlyMode}
            onAdminLogin={handleAdminLogin}
            onViewerLogin={handleViewerLogin}
          />
        )}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className={hideSystemElements ? "overflow-y-auto flex-1 pb-16" : "overflow-hidden h-full"}>
            <OrientationAwareContainer>
              {hideSystemElements ? ( // Use hideSystemElements from state
                <div className="flex flex-col h-screen">
                  <MobileHeader />
                  <main className="flex-1 overflow-hidden">
                    {activeTab === "tables" && (
                      <div className="h-full overflow-y-auto pb-16">
                        <EnhancedMobileTableList
                          tables={tables} // Use tables from state
                          servers={servers} // Use servers from state
                          logs={logs}     // Use logs from state
                          onTableClick={(tableId) => { 
                            const currentTables = state.tables; // Use state
                            const tableToOpen = currentTables.find(t => t.id === tableId);
                            if (tableToOpen) openTableDialog(tableToOpen);
                          }}
                          onEndSession={confirmEndSession}
                          onOpenQuickStartDialog={openQuickStartDialog}
                          canEndSession={hasPermission("canEndSession")}
                          onRefresh={handleRefreshData}
                          showAnimations={tableCardAnimations}
                        />
                      </div>
                    )}
                    {activeTab === "logs" && (
                      <div className="h-full overflow-y-auto pb-16 p-2">
                        <TableSessionLogs logs={logs} />{/* Use logs from state */}
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
                    onShowSettings={() => dispatch({ type: "SET_STATE", payload: { showSettingsDialog: true } })}
                    onLogout={handleLogout}
                    onLogin={handleLogin}
                  />
                </div>
              ) : (
                <TableGrid
                  tables={memoizedTables}
                  servers={memoizedServers}
                  logs={memoizedLogs}
                  onTableClick={openTableDialog}
                  onOpenQuickStartDialog={openQuickStartDialog}
                  onOpenQuickNoteDialog={openQuickNoteDialog}
                  onOpenStatusDialog={openStatusDialog}
                  onMoveRequest={(id) => openTableDialog(memoizedTables.find(t => t.id === id) as Table)}
                  onGroupRequest={(id) => openTableDialog(memoizedTables.find(t => t.id === id) as Table)}
                  onQuickEndSession={confirmEndSession}
                  canQuickStart={hasPermission("canQuickStart")}
                  canEndSession={hasPermission("canEndSession")}
                  showAnimations={tableCardAnimations}
                />
              )}
            </OrientationAwareContainer>
          </div>
        </div>

        {selectedTable && !showQuickStartDialog && (
          <TableDialog
            table={selectedTable}
            servers={memoizedServers}
            allTables={memoizedTables}
            noteTemplates={stateNoteTemplates}
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

        {selectedTable && showQuickStartDialog && (
          <QuickStartDialog
            open={showQuickStartDialog}
            onClose={closeQuickStartDialog}
            table={selectedTable}
            servers={memoizedServers}
            onStart={(guestCount, serverId) => {
              quickStartTableSession(selectedTable.id, guestCount, serverId)
              closeQuickStartDialog()
            }}
          />
        )}

        {selectedTable && showQuickNoteDialog && (
          <QuickNoteDialog
            open={showQuickNoteDialog}
            onClose={closeQuickNoteDialog}
            table={selectedTable}
            noteTemplates={stateNoteTemplates}
            onSave={handleQuickNoteSave}
            onUpdateStatus={updateTableStatuses}
          />
        )}

        {selectedTable && showStatusDialog && (
          <StatusIndicatorDialog
            open={showStatusDialog}
            onClose={closeStatusDialog}
            table={selectedTable}
            onUpdateStatus={updateTableStatuses}
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
          tables={tables} // Use tables from state
          logs={logs}     // Use logs from state
          servers={servers} // Use servers from state
          isStarting={isStartingDay}
          dayStartTime={settings.dayStartTime}
        />
        <SettingsDialog
          open={showSettingsDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showSettingsDialog: false } })}
          servers={servers} // Use servers from state
          onUpdateServers={updateSupabaseServers}
          noteTemplates={stateNoteTemplates} // Use noteTemplates from state
          onUpdateNoteTemplates={updateSupabaseNoteTemplates}
          onShowUserManagement={() => {
            dispatch({ type: "SET_STATE", payload: { showSettingsDialog: false, showUserManagementDialog: true } });
          }}
          onShowLogs={() => {
            dispatch({ type: "SET_STATE", payload: { showSettingsDialog: false, showLogsDialog: true } });
          }}
          onLogout={handleLogout}
          showAdminControls={isAuthenticated && settings.dayStarted}
          currentSettings={settings}
          onUpdateSettings={ async (updatedSettingsPayload) => {
            const currentSettings = state.settings; // Use settings from state
            const currentGroupCounter = state.groupCounter; // Use groupCounter from state
            const newSettings = { ...currentSettings, ...updatedSettingsPayload };
            dispatch({ type: "UPDATE_SETTINGS", payload: updatedSettingsPayload });
            try {
              await updateSupabaseSystemSettings(
                newSettings.dayStarted,
                currentGroupCounter,
                newSettings.showTableCardAnimations,
                newSettings.defaultSessionTime,
                newSettings.warningThreshold,
                newSettings.criticalThreshold
              );
            } catch (error) {
              console.error("Failed to update system settings in Supabase:", error);
              showNotification("Failed to save settings to server.", "error");
              dispatch({ type: "UPDATE_SETTINGS", payload: currentSettings }); // Revert
            }
          }}
          onApplyHighContrast={applyHighContrastMode}
          onApplyLargeText={applyLargeTextMode}
          onApplySoundEffects={applySoundEffects}
          onApplyShowTableCardAnimations={applyShowTableCardAnimations}
          highContrastMode={state.settings.highContrastMode || false} // Use settings from state
          largeTextMode={state.settings.largeTextMode || false}     // Use settings from state
          soundEffectsEnabled={state.settings.soundEnabled} // Use settings from state
        />
        <TableLogsDialog
          open={showLogsDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showLogsDialog: false } })}
          logs={logs} // Use logs from state
        />
        <LoginDialog
          open={showLoginDialog}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showLoginDialog: false, loginAttemptFailed: false } })}
          // loginAttemptFailed={loginAttemptFailed} // This prop might not be needed if LoginDialog handles its own error display
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
        {isAuthenticated && settings.dayStarted && !hideSystemElements && ( // Use hideSystemElements from state
          <PullUpInsightsPanel tables={tables} logs={logs} servers={servers} /> // Use state values
        )}
        <FunctionsDashboard
          open={showFunctionsDashboard}
          onClose={() => dispatch({ type: "SET_STATE", payload: { showFunctionsDashboard: false, activeTab: "tables" } })}
        />
      </div>
    </TooltipProvider>
  );
}
