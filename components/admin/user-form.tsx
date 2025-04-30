"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PermissionsForm } from "@/components/admin/permissions-form"
import type { User } from "@/services/user-service"
import supabaseAuthService from "@/services/supabase-auth-service"
import { useToast } from "@/hooks/use-toast"

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["admin", "server", "viewer"]),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UserFormProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
}

export function UserForm({ user, isOpen, onClose }: UserFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("details")

  const isEditing = !!user

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
      email: user?.email || "",
      role: (user?.role as any) || "viewer",
      password: "",
    },
  })

  // Reset form when user changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: user?.name || "",
        username: user?.username || "",
        email: user?.email || "",
        role: (user?.role as any) || "viewer",
        password: "",
      })
      setActiveTab("details")
    }
  }, [form, user, isOpen])

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true)

    try {
      if (isEditing && user) {
        // Update existing user
        const { success, error } = await supabaseAuthService.updateUser({
          ...user,
          name: data.name,
          username: data.username,
          role: data.role as any,
          email: data.email,
        })

        if (!success) {
          throw new Error(error || "Failed to update user")
        }

        toast({
          title: "User updated",
          description: `${data.name}'s information has been updated.`,
        })
      } else {
        // Create new user
        if (!data.password) {
          toast({
            title: "Error",
            description: "Password is required for new users",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }

        const { success, error } = await supabaseAuthService.signUp(data.email, data.password, {
          username: data.username,
          name: data.name,
          role: data.role as any,
          permissions: supabaseAuthService.DEFAULT_PERMISSIONS[data.role as any],
        })

        if (!success) {
          throw new Error(error || "Failed to create user")
        }

        toast({
          title: "User created",
          description: `${data.name} has been added successfully.`,
        })
      }

      onClose()
    } catch (error: any) {
      console.error("Error saving user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {isEditing
              ? "Update user information and permissions."
              : "Create a new user account and set their permissions."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="details" className="data-[state=active]:bg-gray-700">
              User Details
            </TabsTrigger>
            <TabsTrigger value="permissions" disabled={!isEditing} className="data-[state=active]:bg-gray-700">
              Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="bg-gray-800 border-gray-700 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} className="bg-gray-800 border-gray-700 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          {...field}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="admin" className="text-purple-400">
                            Administrator
                          </SelectItem>
                          <SelectItem value="server" className="text-blue-400">
                            Server
                          </SelectItem>
                          <SelectItem value="viewer" className="text-gray-400">
                            Viewer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-gray-400">
                        This determines the user's base access level.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isEditing && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                        </FormControl>
                        <FormDescription className="text-gray-400">Must be at least 6 characters.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            {isEditing && user && <PermissionsForm userId={user.id} onSaved={() => setActiveTab("details")} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
