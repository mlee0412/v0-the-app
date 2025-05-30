"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Home, List, Settings, LogOut, User, ActivityIcon as FunctionIcon, PlusCircle } from "lucide-react"; // Renamed Function to FunctionIcon
import { useAuth } from "@/contexts/auth-context";
import { hapticFeedback } from "@/utils/haptic-feedback";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MobileBottomNavProps {
  onTabChange: (tab: string) => void;
  onAddSession: () => void;
  activeTab: string;
  dayStarted: boolean;
  isAdmin: boolean;
  onStartDay: () => void;
  onEndDay: () => void;
  onShowSettings: () => void;
  onLogout: () => void;
  onLogin: () => void;
  isAuthenticated: boolean; // Added to directly use from props
}

export function MobileBottomNav({
  onTabChange,
  onAddSession,
  activeTab,
  dayStarted,
  isAdmin,
  onStartDay,
  onEndDay,
  onShowSettings,
  onLogout,
  onLogin,
  isAuthenticated, // Use prop
}: MobileBottomNavProps) {
  // Removed useAuth here, assuming isAuthenticated is passed as a prop
  const { hasPermission } = useAuth(); // Still need this for FAB permission
  const [showFab, setShowFab] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  // Removed touch swipe logic for tabs from bottom nav, as it can be error-prone and conflict with page scroll.
  // Focus on reliable taps.

  useEffect(() => {
    const canAddSession = isAuthenticated && dayStarted && (isAdmin || hasPermission("canStartSession"));
    setShowFab(canAddSession && activeTab === "tables");
  }, [isAuthenticated, isAdmin, hasPermission, dayStarted, activeTab]);

  const handleInteraction = (action: () => void, feedbackType: "selection" | "medium" = "selection") => {
    hapticFeedback[feedbackType]();
    // No timeout needed if direct click/touch is responsive
    action();
  };
  
  const navItems = [
    { id: "tables", label: "TABLES", icon: Home, action: () => handleInteraction(() => onTabChange("tables")) },
    { id: "logs", label: "LOGS", icon: List, action: () => handleInteraction(() => onTabChange("logs")) },
    { id: "functions", label: "FUNCTIONS", icon: FunctionIcon, action: () => handleInteraction(() => onTabChange("functions")) },
    { id: "settings", label: "SETTINGS", icon: Settings, action: () => handleInteraction(onShowSettings) },
    { id: "auth", label: isAuthenticated ? "LOGOUT" : "LOGIN", icon: isAuthenticated ? LogOut : User, action: () => handleInteraction(isAuthenticated ? onLogout : onLogin) },
  ];

  return (
    <TooltipProvider>
      {showFab && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="fixed bottom-[76px] right-5 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-black flex items-center justify-center shadow-lg shadow-cyan-500/30 z-[999] border-0 transition-transform duration-200 active:scale-95"
              onClick={() => handleInteraction(onAddSession, "medium")}
              aria-label="Add new session"
              type="button"
            >
              <PlusCircle className="h-7 w-7" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-black/90 border-cyan-500 text-cyan-300">
            <span className="text-sm font-medium">Add New Session</span>
          </TooltipContent>
        </Tooltip>
      )}

      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 flex justify-between bg-gradient-to-t from-black/95 to-black/85 backdrop-blur-lg border-t border-cyan-500/15 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.7)]"
        role="navigation"
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`flex flex-col items-center justify-center flex-1 mx-1 py-1.5 rounded-lg ${
              activeTab === item.id
                ? "text-cyan-400 bg-cyan-500/10"
                : "text-white/60 hover:bg-white/5 active:bg-white/10"
            } transition-colors duration-200`}
            onClick={item.action}
            aria-pressed={activeTab === item.id}
            aria-label={`${item.label} tab`}
          >
            <div className="relative flex items-center justify-center h-7 w-7 mb-1">
              <item.icon className="h-5 w-5" />
              {activeTab === item.id && (
                <span className="absolute -bottom-1 left-1/2 w-5 h-0.5 bg-cyan-400 rounded-full transform -translate-x-1/2"></span>
              )}
            </div>
            <span className="text-[10px] font-semibold tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </TooltipProvider>
  );
}
