"use client"

import { useEffect } from "react"
import { register } from "@/lib/pwa/register-sw"
import { InstallPwaButton } from "./install-pwa-button"

export function PwaInit() {
  useEffect(() => {
    register()
  }, [])

  return <InstallPwaButton />
}
