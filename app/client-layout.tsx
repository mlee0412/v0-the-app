"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { BilliardsTimerDashboard } from "@/components/system/billiards-timer-dashboard";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import { SpaceBackgroundAnimation } from "@/components/animations/space-background-animation";
import { IOSViewportFix } from "@/components/ios-viewport-fix";
import { IOSTouchFix } from "@/components/ios-touch-fix";
import { DirectTouchHandler } from "@/components/direct-touch-handler";
import { PWAInit } from "@/components/pwa-init";
import { OfflineDetector } from "@/components/mobile/offline-detector";
import { AddUserButton } from "@/components/ui/add-user-button";

export default function ClientLayout({
  children,
}: Readonly<{
  children?: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);

    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, []);

  return (
    <>
      {/* PWAInit is essential and should run early */}
      <PWAInit />
      
      {/* iOS specific fixes also good to have early */}
      <IOSViewportFix />
      <IOSTouchFix />
      <DirectTouchHandler />

      <AuthProvider>
        <OfflineDetector />
        {isClient ? (children || <BilliardsTimerDashboard />) : <div>Loading...</div>}
        <AddUserButton />
      </AuthProvider>

      {/* Background animation rendered after the main content structure */}
      {/* This might help if its setup was impacting initial paint */}
      {isClient && <SpaceBackgroundAnimation intensity={1.5} />}

      <Toaster />
    </>
  );
}
