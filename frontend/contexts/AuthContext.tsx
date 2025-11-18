"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getToken, removeToken, getCurrentUser, UserInfo } from "@/lib/api"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: UserInfo | null
  isLoading: boolean
  isAuthenticated: boolean
  checkAuth: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const checkAuth = async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const userData = await getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error("Auth check failed:", error)
      // Only remove token if it's an authentication error, not a network error
      if (error instanceof Error && error.message === 'Unauthorized') {
        removeToken()
      }
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    removeToken()
    setUser(null)
    router.push("/login")
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        checkAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

