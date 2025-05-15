"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreHorizontal, Pencil, Trash2, ShieldAlert, Shield, Eye, Coffee, Utensils, Lock, Mic } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User } from "@/types/user"
import { ADMIN_LEVEL_ROLES, STAFF_LEVEL_ROLES, USER_ROLE_LABELS } from "@/types/user"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteUser } from "@/actions/user-actions"

interface UserListProps {
  users: User[]
  loading: boolean
  onEditUser: (user: User) => void
  onRefresh: () => void
}

export function UserList({ users, loading, onEditUser, onRefresh }: UserListProps) {
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    try {
      await deleteUser(userToDelete.id)
      toast({
        title: "User deleted",
        description: `${userToDelete.name} has been removed.`,
      })
      onRefresh()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const getRoleBadgeClass = (role: string) => {
    if (ADMIN_LEVEL_ROLES.includes(role as any)) {
      return "bg-purple-500 text-white"
    } else if (role === "server") {
      return "bg-blue-500 text-white"
    } else if (STAFF_LEVEL_ROLES.includes(role as any)) {
      return "bg-green-500 text-white"
    } else {
      return "bg-gray-500 text-white"
    }
  }

  const getRoleIcon = (role: string) => {
    if (role === "admin" || role === "controller" || role === "manager") {
      return <ShieldAlert className="h-4 w-4 mr-1" />
    } else if (role === "server") {
      return <Shield className="h-4 w-4 mr-1" />
    } else if (role === "bartender" || role === "barback") {
      return <Coffee className="h-4 w-4 mr-1" />
    } else if (role === "kitchen") {
      return <Utensils className="h-4 w-4 mr-1" />
    } else if (role === "security") {
      return <Lock className="h-4 w-4 mr-1" />
    } else if (role === "karaoke_main" || role === "karaoke_staff") {
      return <Mic className="h-4 w-4 mr-1" />
    } else {
      return <Eye className="h-4 w-4 mr-1" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-4 px-4 py-2 font-medium text-gray-400">
        <div>Name</div>
        <div>Username</div>
        <div>Role</div>
        <div>Created</div>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-4 gap-4 items-center p-4 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-750"
          >
            <div className="flex items-center space-x-2">
              <div className="font-medium text-white">{user.name}</div>
            </div>

            <div className="text-gray-300">{user.username}</div>

            <div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(
                  user.role,
                )}`}
              >
                {getRoleIcon(user.role)}
                {USER_ROLE_LABELS[user.role as any] || user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                  <DropdownMenuItem
                    className="flex items-center cursor-pointer hover:bg-gray-700"
                    onClick={() => onEditUser(user)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem
                    className="flex items-center cursor-pointer text-red-500 hover:bg-gray-700 hover:text-red-500"
                    onClick={() => handleDeleteClick(user)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="p-8 text-center border border-dashed border-gray-700 rounded-lg">
            <p className="text-gray-400">No users found</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete {userToDelete?.name}'s account and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={(e) => {
                e.preventDefault()
                handleDeleteConfirm()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
