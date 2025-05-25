"use client"

import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

// This is the primary, standardized function name
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent
      // Check for common mobile keywords in userAgent
      const mobileRegex = /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
      const isMobileUserAgent = mobileRegex.test(userAgent)
      
      // Also check screen width for responsiveness
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT

      setIsMobile(isMobileUserAgent || isSmallScreen)
    }

    checkMobile() // Initial check

    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return !!isMobile // Ensure a boolean is always returned
}

// Export 'useMobile' as an alias for backward compatibility within your project
export const useMobile = useIsMobile;
