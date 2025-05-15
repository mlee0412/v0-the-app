"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import supabaseAuthService from "@/services/supabase-auth-service"
import { useToast } from "@/hooks/use-toast"
import type { Permission } from "@/services/user-service"
import { Loader2 } from "lucide-react"

interface PermissionsFormProps {
  userId: string
  onSaved: () => void
}

export function PermissionsForm({ userId, onSaved }: PermissionsFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const form = useForm<Permission>({
    defaultValues: {
      canStartSession: false,
      canEndSession: false,
      canAddTime: false,
      canSubtractTime: false,
      canUpdateGuests: false,
      canAssignServer: false,
      canGroupTables: false,
      canUngroupTable: false,
      canMoveTable: false,
      canUpdateNotes: false,
      canViewLogs: false,
      canManageUsers: false,
      canManageSettings: false,
    },
  })

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true)
        const user = await supabaseAuthService.getUserById(userId)

        if (user && user.permissions) {
          form.reset(user.permissions)
        }
      } catch (error) {
        console.error("Error fetching user permissions:", error)
        toast({
          title: "Error",
          description: "Failed to load user permissions.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [userId, form, toast])

  const onSubmit = async (data: Permission) => {
    setSaving(true)

    try {
      const user = await supabaseAuthService.getUserById(userId)

      if (!user) {
        throw new Error("User not found")
      }

      const updatedUser = {
        ...user,
        permissions: data,
      }

      const { success, error } = await supabaseAuthService.updateUser(updatedUser)

      if (!success) {
        throw new Error(error || "Failed to update permissions")
      }

      toast({
        title: "Permissions updated",
        description: "User permissions have been updated successfully.",
      })

      onSaved()
    } catch (error: any) {
      console.error("Error updating permissions:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-cyan-400">Session Management</h3>
          <p className="text-sm text-gray-400">Control what actions the user can perform on billiard sessions.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField
              control={form.control}
              name="canStartSession"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Start Sessions</FormLabel>
                    <FormDescription className="text-gray-400">Can start new billiard sessions</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canEndSession"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">End Sessions</FormLabel>
                    <FormDescription className="text-gray-400">Can end active billiard sessions</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canAddTime"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Add Time</FormLabel>
                    <FormDescription className="text-gray-400">Can add time to active sessions</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canSubtractTime"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Subtract Time</FormLabel>
                    <FormDescription className="text-gray-400">Can remove time from active sessions</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="bg-gray-700" />

        <div>
          <h3 className="text-lg font-medium text-cyan-400">Table Management</h3>
          <p className="text-sm text-gray-400">Control what actions the user can perform on billiard tables.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField
              control={form.control}
              name="canUpdateGuests"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Update Guests</FormLabel>
                    <FormDescription className="text-gray-400">Can update guest count on tables</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canAssignServer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Assign Servers</FormLabel>
                    <FormDescription className="text-gray-400">Can assign servers to tables</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canGroupTables"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Group Tables</FormLabel>
                    <FormDescription className="text-gray-400">Can group multiple tables together</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canUngroupTable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Ungroup Tables</FormLabel>
                    <FormDescription className="text-gray-400">Can remove tables from groups</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canMoveTable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Move Tables</FormLabel>
                    <FormDescription className="text-gray-400">Can rearrange table positions</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canUpdateNotes"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Update Notes</FormLabel>
                    <FormDescription className="text-gray-400">Can add/edit notes on tables</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="bg-gray-700" />

        <div>
          <h3 className="text-lg font-medium text-cyan-400">Administrative Access</h3>
          <p className="text-sm text-gray-400">Control access to administrative functions.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField
              control={form.control}
              name="canViewLogs"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">View Logs</FormLabel>
                    <FormDescription className="text-gray-400">Can access session logs and history</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canManageUsers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Manage Users</FormLabel>
                    <FormDescription className="text-gray-400">Can create, edit, and delete users</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canManageSettings"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-white">Manage Settings</FormLabel>
                    <FormDescription className="text-gray-400">Can modify system settings</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-cyan-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSaved}
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            {saving ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
