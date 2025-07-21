// File: components/tables/TableTimerDisplay.tsx
"use client";

import React, { useMemo } from "react";
import type { Table } from "@/components/system/billiards-timer-dashboard"; // Assuming Table type is defined here
import { useTableTimer } from "@/hooks/use-table-timer"; // Assuming this hook provides formattedTime and timer logic
import { THRESHOLDS } from "@/constants";

// Props for the new component
interface TableTimerDisplayProps {
  // Pass only the necessary parts of the table for the timer
  table: Pick<Table, "isActive" | "startTime" | "initialTime" | "remainingTime" | "id">;
  // Pass the tableStatus object or individual status flags
  isOvertime: boolean;
  isCritical: boolean;
  isWarningOrange: boolean;
  isWarningYellow: boolean;
  showAnimations?: boolean; // To control animations like pulse highlight
}

export function TableTimerDisplay({
  table,
  isOvertime,
  isCritical,
  isWarningOrange,
  isWarningYellow,
  showAnimations = true,
}: TableTimerDisplayProps) {
  const timer = useTableTimer(table, showAnimations); // The hook now lives here

  const getTimerTextColor = useMemo(() => {
    if (isOvertime || isCritical) return "#FF4500"; // Bright Red-Orange
    if (isWarningOrange) return "#FFA500"; // Orange
    if (isWarningYellow) return "#FFFF00"; // Yellow
    if (table.isActive) return "#ADFF2F"; // Green-Yellow (Lime Green)
    return "#FFFFFF"; // White for inactive or normal active
  }, [isOvertime, isCritical, isWarningOrange, isWarningYellow, table.isActive]);

  const getTimerTextShadow = useMemo(() => {
    if (isOvertime || isCritical)
      return "0 0 12px rgba(255, 69, 0, 0.9), 0 0 20px rgba(255, 0, 0, 0.7), 0 0 30px rgba(255, 0, 0, 0.5)";
    if (isWarningOrange) return "0 0 10px rgba(255, 165, 0, 0.8), 0 0 20px rgba(255, 165, 0, 0.6)";
    if (isWarningYellow) return "0 0 8px rgba(255, 255, 0, 0.8), 0 0 16px rgba(255, 255, 0, 0.6)";
    if (table.isActive) return "0 0 7px rgba(173, 255, 47, 0.8), 0 0 14px rgba(173, 255, 47, 0.6)";
    return "0 0 5px rgba(255, 255, 255, 0.3), 0 0 10px rgba(255, 255, 255, 0.2)";
  }, [isOvertime, isCritical, isWarningOrange, isWarningYellow, table.isActive]);

  const getTimerBorder = useMemo(() => {
    if (isOvertime || isCritical) return "border-red-500/80";
    if (isWarningOrange) return "border-orange-500/70";
    if (isWarningYellow) return "border-yellow-400/70";
    if (table.isActive) return "border-green-500/60";
    return "border-cyan-500/60"; // Default/Inactive
  }, [isOvertime, isCritical, isWarningOrange, isWarningYellow, table.isActive]);

  return (
    <div className={`flex justify-center items-center my-1 sm:my-2 ${showAnimations ? "animate-float" : ""}`}>
      <div
        className={`text-xl sm:text-2xl md:text-3xl font-bold py-1 px-3 rounded-md border bg-black/50 backdrop-blur-sm shadow-inner ${getTimerBorder()} transition-all duration-300 ${
          showAnimations && Math.abs(timer.remainingTime % 60000) < 1000 ? "animate-pulse-highlight" : ""
        }`}
        style={{ color: getTimerTextColor(), textShadow: getTimerTextShadow() }}
        key={timer.remainingTime} // This can help force re-render/animation
        data-value={timer.remainingTime}
      >
        {timer.formattedRemainingTime}
      </div>
    </div>
  );
}
