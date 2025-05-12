"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface Role {
  id: string
  name: string
  description?: string
}

export default function AddUserForm() {
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [nativeLanguage, setNativeLanguage] = useState("English")
  const [aiTone, setAiTone] = useState("neutral")
  const [passcode, setPasscode] = useState("")
  const [roleId, setRoleId] = useState("")
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingRoles, setFetchingRoles] = useState(true)

  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchRoles() {
      try {
        const { data, error } = await supabase.from("roles").select("*").order("name")

        if (error) {
          throw error
        }

        setRoles(data || [])
        if (data && data.length > 0) {
          // Default to staff role
          const staffRole = data.find((role) => role.name === "staff")
          setRoleId(staffRole?.id || data[0].id)
        }
      } catch (error) {
        console.error("Error fetching roles:", error)
        toast({
          title: "Error",
          description: "Failed to load roles. Please try again.",
          variant: "destructive",
        })
      } finally {
        setFetchingRoles(false)
      }
    }

    fetchRoles()
  }, [supabase])

  const validatePasscode = (code: string) => {
    return /^\d{4}$/.test(code)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePasscode(passcode)) {
      toast({
        title: "Invalid Passcode",
        description: "Passcode must be exactly 4 digits",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Create auth user first - this is the critical step
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: passcode,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          display_name: displayName,
          native_language: nativeLanguage,
          ai_tone: aiTone,
          role_id: roleId,
          phone_number: phoneNumber,
        },
      })

      if (authError) {
        throw authError
      }

      toast({
        title: "Success",
        description: "User created successfully",
      })

      // Reset form
      setEmail("")
      setDisplayName("")
      setPhoneNumber("")
      setNativeLanguage("English")
      setAiTone("neutral")
      setPasscode("")
    } catch (error) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Add New User</CardTitle>
        <CardDescription>Create a new user account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nativeLanguage">Native Language</Label>
            <Select value={nativeLanguage} onValueChange={setNativeLanguage} required>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="Korean">Korean</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aiTone">AI Assistant Tone</Label>
            <Select value={aiTone} onValueChange={setAiTone} required>
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                <SelectItem value="cosmic">Cosmic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passcode">4-Digit Passcode</Label>
            <Input
              id="passcode"
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
              placeholder="****"
              className="text-center tracking-widest text-xl"
            />
            <p className="text-xs text-muted-foreground">Must be exactly 4 digits</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={roleId} onValueChange={setRoleId} disabled={fetchingRoles} required>
              <SelectTrigger>
                <SelectValue placeholder={fetchingRoles ? "Loading roles..." : "Select role"} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    {role.description && ` - ${role.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating User...
              </>
            ) : (
              "Create User"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
