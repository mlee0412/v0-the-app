"use client";

import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import type { Table } from "@/components/system/billiards-timer-dashboard";

interface TableTimerDisplayProps {
  table: Pick<Table, "isActive" | "startTime" | "initialTime" | "remainingTime" | "id">;
  isOvertime: boolean;
  isCritical: boolean;
  isWarningOrange: boolean;
  isWarningYellow: boolean;
  showAnimations?: boolean;
}

const TableTimerDisplayComponent = ({
  table,
  isOvertime,
  isCritical,
  isWarningOrange,
  isWarningYellow,
  showAnimations = true,
}: TableTimerDisplayProps) => {
  const calculateCurrentTime = () => {
    if (!table.isActive || !table.startTime) {
      return table.initialTime;
    }
    return table.initialTime - (Date.now() - table.startTime);
  };

  const [displayTime, setDisplayTime] = useState(calculateCurrentTime);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  const formattedTime = useMemo(() => {
    const isNegative = displayTime < 0;
    const absoluteMs = Math.abs(displayTime);
    const totalSeconds = Math.floor(absoluteMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const sign = isNegative ? "-" : "";
    return `${sign}${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [displayTime]);

  const timerTextColor = useMemo(() => {
    if (isOvertime || isCritical) return "#FF4500";
    if (isWarningOrange) return "#FFA500";
    if (isWarningYellow) return "#FFFF00";
    if (table.isActive) return "#ADFF2F";
    return "#FFFFFF";
  }, [isOvertime, isCritical, isWarningOrange, isWarningYellow, table.isActive]);

  const timerTextShadow = useMemo(() => {
    if (isOvertime || isCritical)
      return "0 0 12px rgba(255, 69, 0, 0.9), 0 0 20px rgba(255, 0, 0, 0.7), 0 0 30px rgba(255, 0, 0, 0.5)";
    if (isWarningOrange) return "0 0 10px rgba(255, 165, 0, 0.8), 0 0 20px rgba(255, 165, 0, 0.6)";
    if (isWarningYellow) return "0 0 8px rgba(255, 255, 0, 0.8), 0 0 16px rgba(255, 255, 0, 0.6)";
    if (table.isActive) return "0 0 7px rgba(173, 255, 47, 0.8), 0 0 14px rgba(173, 255, 47, 0.6)";
    return "0 0 5px rgba(255, 255, 255, 0.3), 0 0 10px rgba(255, 255, 255, 0.2)";
  }, [isOvertime, isCritical, isWarningOrange, isWarningYellow, table.isActive]);

  const timerBorder = useMemo(() => {
    if (isOvertime || isCritical) return "border-red-500/80";
    if (isWarningOrange) return "border-orange-500/70";
    if (isWarningYellow) return "border-yellow-400/70";
    if (table.isActive) return "border-green-500/60";
    return "border-cyan-500/60";
  }, [isOvertime, isCritical, isWarningOrange, isWarningYellow, table.isActive]);

  useEffect(() => {
    if (!table.isActive || !table.startTime) {
      setDisplayTime(table.initialTime);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();

      if (now - lastUpdateRef.current >= 100) {
        const newTime = table.initialTime - (now - table.startTime);
        setDisplayTime(newTime);
        lastUpdateRef.current = now;
      }

      rafRef.current = requestAnimationFrame(updateTimer);
    };

    rafRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [table.isActive, table.startTime, table.initialTime]);

  useEffect(() => {
    if (!table.isActive || !table.startTime) {
      setDisplayTime(table.initialTime);
    }
  }, [table.isActive, table.startTime, table.initialTime, table.remainingTime]);

  return (
    <div className={`flex justify-center items-center my-1 sm:my-2 ${showAnimations ? "animate-float" : ""}`}>
      <div
        className={`text-xl sm:text-2xl md:text-3xl font-bold py-1 px-3 rounded-md border bg-black/50 backdrop-blur-sm shadow-inner ${timerBorder} transition-all duration-300 ${
          showAnimations && Math.abs(displayTime % 60000) < 1000 ? "animate-pulse-highlight" : ""
        }`}
        style={{ color: timerTextColor, textShadow: timerTextShadow }}
        data-value={displayTime}
      >
        {formattedTime}
      </div>
    </div>
  );
};

export const TableTimerDisplay = memo(
  TableTimerDisplayComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.table.id === nextProps.table.id &&
      prevProps.table.isActive === nextProps.table.isActive &&
      prevProps.table.startTime === nextProps.table.startTime &&
      prevProps.table.initialTime === nextProps.table.initialTime &&
      prevProps.isOvertime === nextProps.isOvertime &&
      prevProps.isCritical === nextProps.isCritical &&
      prevProps.isWarningOrange === nextProps.isWarningOrange &&
      prevProps.isWarningYellow === nextProps.isWarningYellow &&
      prevProps.showAnimations === nextProps.showAnimations
    );
  },
);

TableTimerDisplay.displayName = "TableTimerDisplay";
