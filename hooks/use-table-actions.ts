import { useCallback } from "react";
import type { Table } from "@/components/system/billiards-timer-dashboard"; // Ensure this path is correct
import { DEFAULT_SESSION_TIME } from "@/constants"; // Ensure this path is correct

interface TableActionsProps {
  tables: Table[];
  dispatch: React.Dispatch<any>; // Replace 'any' with your actual DashboardAction type if available
  debouncedUpdateTable: (table: Table) => void;
  debouncedUpdateTables: (tables: Table[]) => void;
  addLogEntry: (tableId: number, action: string, details?: string) => Promise<void>;
  showNotification: (message: string, type: "success" | "error" | "info") => void;
  formatMinutes: (minutes: number) => number;
}

export function useTableActions({
  tables,
  dispatch,
  debouncedUpdateTable,
  debouncedUpdateTables,
  addLogEntry,
  showNotification,
  formatMinutes,
}: TableActionsProps) {
  const startTableSession = useCallback(
    async (
      tableId: number,
      currentGuestCount: number, // New parameter
      currentServerId: string | null, // New parameter
      closeTableDialog: () => void
    ) => {
      try {
        const table = tables.find((t) => t.id === tableId);
        if (!table) {
          showNotification("Table not found", "error");
          return;
        }

        // Use the directly passed currentGuestCount and currentServerId for validation
        if (currentGuestCount <= 0) {
          showNotification("Add at least one guest to start the session.", "error");
          return;
        }

        if (!currentServerId) {
          showNotification("Please assign a server to start the session.", "error");
          return;
        }

        const startTime = Date.now();
        const updatedAt = new Date().toISOString();
        // Use the table's initialTime or a default if starting fresh
        const sessionInitialTime = table.initialTime > 0 ? table.initialTime : DEFAULT_SESSION_TIME;

        const updatedTableData = {
          isActive: true,
          startTime,
          remainingTime: sessionInitialTime, // Start with full initial time
          initialTime: sessionInitialTime,   // Ensure initialTime is set correctly
          guestCount: currentGuestCount,    // Use validated guest count
          server: currentServerId,          // Use validated server
          hasNotes: false,
          noteId: "",
          noteText: "",
          statusIndicators: [],
          updatedAt,
        };

        if (table.groupId) {
          const groupTablesToUpdate = tables
            .filter((t) => t.groupId === table.groupId)
            .map(t => ({ ...t, ...updatedTableData, id: t.id, name: t.name, guestCount: currentGuestCount, server: currentServerId })); // Apply all relevant updates to group

          dispatch({ type: "SET_TABLES", payload: tables.map(t => groupTablesToUpdate.find(ut => ut.id === t.id) || t) });
          debouncedUpdateTables(groupTablesToUpdate);

          await addLogEntry(
            tableId, 
            "Group Session Started",
            `Group: ${table.groupId}, Guests: ${currentGuestCount}, Server: ${currentServerId}`
          );
          showNotification(`Started group session for ${table.groupId}`, "success");
        } else {
          const updatedTable = { ...table, ...updatedTableData };
          dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
          debouncedUpdateTable(updatedTable);
          await addLogEntry(
            tableId,
            "Session Started",
            `Initial time: ${formatMinutes(sessionInitialTime / 60000)} minutes, Guests: ${currentGuestCount}, Server: ${currentServerId}`
          );
          showNotification(`Started session for ${table.name}`, "success");
        }

        closeTableDialog(); // This should be called by the parent (BilliardsTimerDashboard) after its state updates.
                           // For now, keeping it here, but parent control is better.
        window.dispatchEvent(
          new CustomEvent("table-updated", { detail: { tableId, table: { ...table, ...updatedTableData } } })
        );
      } catch (error) {
        console.error("Failed to start session:", error);
        showNotification("Failed to start session", "error");
      }
    },
    [tables, dispatch, debouncedUpdateTable, debouncedUpdateTables, addLogEntry, showNotification, formatMinutes]
  );

  const quickStartTableSession = useCallback(
    async (tableId: number, guestCount: number, serverId: string) => {
      try {
        const table = tables.find((t) => t.id === tableId);
        if (!table) {
          showNotification("Table not found", "error");
          return;
        }

        const startTime = Date.now();
        const updatedAt = new Date().toISOString();

        const updatedTable = {
          ...table,
          isActive: true,
          startTime,
          remainingTime: DEFAULT_SESSION_TIME,
          initialTime: DEFAULT_SESSION_TIME,
          guestCount,
          server: serverId,
          hasNotes: false,
          noteId: "",
          noteText: "",
          statusIndicators: [],
          updatedAt,
        };

        dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
        debouncedUpdateTable(updatedTable);
        await addLogEntry(
          tableId,
          "Quick Session Started",
          `Guests: ${guestCount}, Server: ${serverId}`,
        );
        showNotification(`Quick session started for ${table.name}`, "success");

        window.dispatchEvent(
          new CustomEvent("table-updated", { detail: { tableId, table: updatedTable } })
        );
      } catch (error) {
        console.error("Failed to quick start session:", error);
        showNotification("Failed to quick start session", "error");
      }
    },
    [tables, dispatch, debouncedUpdateTable, addLogEntry, showNotification]
  );

  const endTableSession = useCallback(
    async (tableId: number, closeTableDialog: () => void) => {
      try {
        const table = tables.find((t) => t.id === tableId);
        if (!table) {
          showNotification("Table not found", "error");
          return;
        }

        const updatedAt = new Date().toISOString();
        let tablesToUpdateInDB: Table[] = [];
        let notificationMessage = "";

        const resetFields = {
          isActive: false,
          startTime: null,
          remainingTime: DEFAULT_SESSION_TIME,
          initialTime: DEFAULT_SESSION_TIME,
          guestCount: 0,
          server: null,
          hasNotes: false,
          noteId: "",
          noteText: "",
          statusIndicators: [],
          updatedAt,
        };

        if (table.groupId) {
          const groupId = table.groupId;
          const groupTablesOriginal = tables.filter((t) => t.groupId === groupId);
          
          const updatedGlobalTables = tables.map((t) =>
            t.groupId === groupId
              ? { ...t, ...resetFields, groupId: null } 
              : t
          );
          tablesToUpdateInDB = updatedGlobalTables.filter(t => groupTablesOriginal.some(gt => gt.id === t.id));
          dispatch({ type: "SET_TABLES", payload: updatedGlobalTables });
          
          if (groupTablesOriginal.length > 0) {
            await addLogEntry(
              tableId, // Log against the table that initiated the group end
              "Group Session Ended",
              `Group: ${groupId}, Tables: ${groupTablesOriginal.map((t) => t.name).join(", ")}`
            );
          }
          notificationMessage = `Ended group session for ${groupId}`;
        } else {
          const elapsedTime = table.initialTime - table.remainingTime;
          await addLogEntry(
            tableId,
            "Session Ended",
            `Duration: ${formatMinutes(Math.max(0, elapsedTime) / 60000)} minutes, Players: ${table.guestCount}`
          );
          const updatedTable = { ...table, ...resetFields };
          tablesToUpdateInDB = [updatedTable];
          dispatch({ type: "UPDATE_TABLE", payload: updatedTable });
          notificationMessage = `Ended session for ${table.name}`;
        }

        if (tablesToUpdateInDB.length > 0) {
          debouncedUpdateTables(tablesToUpdateInDB);
        }
        
        showNotification(notificationMessage, "info");
        closeTableDialog(); // Similar to startSession, parent control might be better.
        window.dispatchEvent(new CustomEvent("session-ended", { detail: { tableId } }));
      } catch (error) {
        console.error("Failed to end session:", error);
        showNotification("Failed to end session", "error");
      }
    },
    [tables, dispatch, debouncedUpdateTables, debouncedUpdateTable, addLogEntry, showNotification, formatMinutes] // Added debouncedUpdateTable
  );

  return { startTableSession, quickStartTableSession, endTableSession };
}
