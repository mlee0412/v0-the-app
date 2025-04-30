"use client"

import { useState, useEffect } from "react"
import { getUsers } from "@/actions/user-actions"
import type { User } from "@/types/user"

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return {
    users,
    loading,
    error,
    refreshUsers: fetchUsers,
  }
}
