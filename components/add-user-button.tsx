"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserPlusIcon } from "lucide-react"
import { AddUserDialog } from "@/components/add-user-dialog"

export function AddUserButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50 rounded-full w-12 h-12 bg-black/50 border border-[#00FFFF] hover:bg-[#000033] hover:border-[#00FFFF] transition-all duration-300 shadow-[0_0_10px_rgba(0,255,255,0.5)]"
        onClick={() => setIsDialogOpen(true)}
      >
        <UserPlusIcon className="h-6 w-6 text-[#00FFFF]" />
        <span className="sr-only">Add User</span>
      </Button>

      <AddUserDialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </>
  )
}
