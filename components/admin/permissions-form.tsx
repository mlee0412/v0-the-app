"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { getUserPermissions, updateUserPermissions } from "@/actions/user-actions"
import type { Permissions } from "@/types/user"

interface PermissionsFormProps {
  userId: string
  onSaved: () => void
}

export function PermissionsForm({ userId, onSaved }: PermissionsFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const form = useForm<Permissions>({
    defaultValues: {
      can_start_session: false,
      can_end_session: false,
      can_add_time: false,
      can_subtract_time: false,
      can_update_guests: false,
      can_assign_server: false,
      can_group_tables: false,
      can_ungroup_table: false,
      can_move_table: false,
      can_update_notes: false,
      can_view_logs: false,
      can_manage_users: false,
      can_manage_settings: false,
    },
  })

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true)
        const permissions = await getUserPermissions(userId)

        if (permissions) {
          form.reset(permissions)
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

  const onSubmit = async (data: Permissions) => {
    setSaving(true)

    try {
      await updateUserPermissions(userId, data)

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
              name="can_start_session"
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
              name="can_end_session"
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
              name="can_add_time"
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
              name="can_subtract_time"
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
              name="can_update_guests"
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
              name="can_assign_server"
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
              name="can_group_tables"
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
              name="can_ungroup_table"
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
              name="can_move_table"
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
              name="can_update_notes"
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
              name="can_view_logs"
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
              name="can_manage_users"
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
              name="can_manage_settings"
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
