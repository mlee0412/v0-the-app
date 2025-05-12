"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, X, ArrowLeft, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { getUsers } from "@/actions/user-actions"
import supabaseAuthService from "@/services/supabase-auth-service"

interface TouchLoginDialogProps {
  onClose?: () => void
}

function TouchLoginDialogComponent({ onClose }: TouchLoginDialogProps) {
  const [username, setUsername] = useState("")
  const [passcode, setPasscode] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"username" | "passcode">("username")
  const [showPasscode, setShowPasscode] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; username: string; name: string; role: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const auth = useAuth()
  const router = useRouter()

  // Fetch users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        const fetchedUsers = await getUsers()
        setUsers(fetchedUsers)
        console.log("Fetched users:", fetchedUsers)
      } catch (error) {
        console.error("Error fetching users:", error)
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])

  // Check if we have a stored username
  useEffect(() => {
    const storedUsername = localStorage.getItem("lastLoginUsername")
    if (storedUsername) {
      setUsername(storedUsername)
    }
  }, [])

  const handleUsernameSubmit = (selectedUsername: string) => {
    if (!selectedUsername) {
      toast({
        title: "Username Required",
        description: "Please select a user",
        variant: "destructive",
      })
      return
    }

    // Store username for future logins
    localStorage.setItem("lastLoginUsername", selectedUsername)

    // Set the username and move to passcode step
    setUsername(selectedUsername)
    setStep("passcode")
  }

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passcode.length !== 4) {
      toast({
        title: "Invalid Passcode",
        description: "Passcode must be exactly 4 digits",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      console.log("Attempting login with:", { username, passcode })

      // Use the supabaseAuthService to authenticate
      const authenticatedUser = await supabaseAuthService.authenticate(username, passcode)

      if (!authenticatedUser) {
        throw new Error("Invalid username or passcode")
      }

      // Store the user directly in localStorage
      localStorage.setItem("currentUser", JSON.stringify(authenticatedUser))
      console.log("User data stored in localStorage:", authenticatedUser)

      // Try to use the auth context login as well
      try {
        await auth.login(username, passcode)
      } catch (authError) {
        console.warn("Auth context login failed, but we'll continue with localStorage:", authError)
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      })

      // Close the dialog if onClose is provided
      if (typeof onClose === "function") {
        onClose()
      }

      // Force a complete page reload to ensure all auth state is properly updated
      console.log("Redirecting to dashboard...")
      window.location.href = "/"
    } catch (error) {
      console.error("Error logging in:", error)
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or passcode. Please try again.",
        variant: "destructive",
      })

      // Clear passcode on error
      setPasscode("")
    } finally {
      setLoading(false)
    }
  }

  const handleKeypadPress = (digit: string) => {
    if (passcode.length < 4) {
      setPasscode((prev) => prev + digit)

      // Auto-submit when 4 digits are entered
      if (passcode.length === 3) {
        setTimeout(() => {
          const form = document.getElementById("passcode-form") as HTMLFormElement
          if (form) form.requestSubmit()
        }, 300)
      }
    }
  }

  const handleBackspace = () => {
    setPasscode((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setPasscode("")
  }

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose()
    } else {
      // If no onClose function is provided, redirect to home page
      router.push("/")
    }
  }

  const renderKeypad = () => {
    const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"]

    return (
      <div className="grid grid-cols-3 gap-4 mt-6">
        {digits.map((digit, index) => {
          if (digit === "") {
            return <div key={index} />
          }

          if (digit === "del") {
            return (
              <Button key={index} type="button" variant="outline" className="h-16 text-lg" onClick={handleBackspace}>
                <X className="h-6 w-6" />
              </Button>
            )
          }

          return (
            <Button
              key={index}
              type="button"
              variant="outline"
              className="h-16 text-2xl font-medium"
              onClick={() => handleKeypadPress(digit)}
            >
              {digit}
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md mx-auto border border-cyan-500/50 bg-black/90 text-cyan-50">
        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {step === "username" ? (
          <>
            <CardHeader>
              <CardTitle className="text-2xl text-center bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                Space Billiards Login
              </CardTitle>
              <CardDescription className="text-center text-gray-400">Select your user to continue</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </div>
              ) : users.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {users.map((user) => (
                    <Button
                      key={user.id}
                      variant="outline"
                      className="h-16 text-lg border-cyan-700 bg-black/60 hover:bg-cyan-950 hover:text-cyan-400"
                      onClick={() => handleUsernameSubmit(user.username)}
                    >
                      <User className="h-5 w-5 mr-2" />
                      {user.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <p>No users found. Please add users in the admin panel.</p>
                  <Button className="mt-4 bg-cyan-700 hover:bg-cyan-600" onClick={handleClose}>
                    Close
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mr-2 text-gray-400 hover:text-cyan-400"
                  onClick={() => setStep("username")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Enter Passcode
                  </CardTitle>
                  <CardDescription className="flex items-center text-gray-400">
                    <User className="h-4 w-4 mr-1" />
                    {users.find((u) => u.username === username)?.name || username}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <form id="passcode-form" onSubmit={handlePasscodeSubmit}>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showPasscode ? "text" : "password"}
                        value={passcode}
                        readOnly
                        className="text-center tracking-widest text-2xl h-16 bg-black/60 border-cyan-700 text-cyan-400"
                        maxLength={4}
                      />
                      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none flex justify-center items-center">
                        <div className="flex space-x-4">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${i < passcode.length ? "bg-cyan-500" : "bg-gray-700"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400"
                        onClick={() => setShowPasscode(!showPasscode)}
                      >
                        {showPasscode ? "Hide" : "Show"}
                      </Button>
                    </div>
                  </div>

                  {renderKeypad()}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button
                  type="submit"
                  className="w-full bg-cyan-700 hover:bg-cyan-600 text-white"
                  disabled={loading || passcode.length !== 4}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-cyan-400"
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  )
}

// Export both as default and named export
export default TouchLoginDialogComponent
export const TouchLoginDialog = TouchLoginDialogComponent
