"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShieldIcon } from "lucide-react"
import { SupabaseUserManagement } from "@/components/admin/supabase-user-management"

interface UserManagementDialogProps {
  open: boolean
  onClose: () => void
}

export function UserManagementDialog({ open, onClose }: UserManagementDialogProps) {
  return (
    <Dialog className="user-management-dialog" open={open} onOpenChange={onClose}>
      <DialogContent className="dialog-content sm:max-w-[700px] bg-gray-900 text-white border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="dialog-header mb-4">
          <DialogTitle className="text-2xl text-cyan-400 flex items-center gap-2">
            <ShieldIcon className="h-6 w-6" />
            User Management
          </DialogTitle>
        </DialogHeader>

        <div className="dialog-body overflow-y-auto flex-1">
          <SupabaseUserManagement />
        </div>

        <DialogFooter className="dialog-footer mt-4 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 bg-gray-800 hover:bg-gray-700 text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
