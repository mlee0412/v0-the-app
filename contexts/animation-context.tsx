"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface AnimationContextValue {
  backgroundEnabled: boolean
  setBackgroundEnabled: (enabled: boolean) => void
}

const AnimationContext = createContext<AnimationContextValue | undefined>(undefined)

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [backgroundEnabled, setBackgroundEnabled] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("backgroundEnabled")
    if (stored !== null) setBackgroundEnabled(stored === "true")
  }, [])

  useEffect(() => {
    localStorage.setItem("backgroundEnabled", String(backgroundEnabled))
  }, [backgroundEnabled])

  return (
    <AnimationContext.Provider value={{ backgroundEnabled, setBackgroundEnabled }}>
      {children}
    </AnimationContext.Provider>
  )
}

export function useAnimation() {
  const ctx = useContext(AnimationContext)
  if (!ctx) throw new Error("useAnimation must be used within AnimationProvider")
  return ctx
}
