"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"
import { AddUserDialog } from "@/components/admin/add-user-dialog"
import { useToast } from "@/hooks/use-toast"
import { hapticFeedback } from "@/utils/haptic-feedback"

export function AddUserButton() {
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { toast } = useToast()

  // Check if we're on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Safe access to localStorage to check admin status
  const isAdmin =
    typeof window !== "undefined"
      ? (() => {
          try {
            const user = JSON.parse(localStorage.getItem("currentUser") || "{}")
            return user?.role === "admin" || user?.role === "manager"
          } catch (e) {
            return false
          }
        })()
      : false

  const isAuthenticated = typeof window !== "undefined" ? !!localStorage.getItem("currentUser") : false

  // Only show for admins
  if (!isAuthenticated || !isAdmin) {
    return null
  }

  const handleClick = () => {
    // Add haptic feedback
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      hapticFeedback.medium()
    }

    setShowAddUserDialog(true)
  }

  return (
    <>
      <Button
        size="icon"
        className={`rounded-full shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-300 elastic-press ${
          isMobile
            ? "fixed bottom-24 right-5 z-50 bg-[#00FFFF] text-black hover:bg-[#00CCCC] h-12 w-12"
            : "fixed bottom-10 right-10 z-50 bg-[#00FFFF] text-black hover:bg-[#00CCCC] h-14 w-14"
        }`}
        onClick={handleClick}
        aria-label="Add User"
      >
        <UserPlus className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
      </Button>

      <AddUserDialog
        open={showAddUserDialog}
        onClose={() => setShowAddUserDialog(false)}
        onUserAdded={() => {
          setShowAddUserDialog(false)
          toast({
            title: "Success",
            description: "User added successfully",
          })
        }}
      />
    </>
  )
}
