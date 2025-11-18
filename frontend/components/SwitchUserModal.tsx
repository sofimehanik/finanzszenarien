"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { login, getCurrentUser, getToken, UserInfo } from "@/lib/api"
import { saveRecentUser, getRecentUsers, SavedUser } from "@/lib/userStorage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, User, LogIn, ChevronRight, Check } from "lucide-react"

interface SwitchUserModalProps {
  open: boolean
  onClose: () => void
  onSwitchUser: () => void
  prefillEmail?: string
}

const MAX_SAVED_USERS = 5
const STORAGE_KEY = 'finsim_saved_users'

export function SwitchUserModal({ open, onClose, onSwitchUser, prefillEmail }: SwitchUserModalProps) {
  const { user: currentUser, checkAuth } = useAuth()
  const [savedUsers, setSavedUsers] = useState<SavedUser[]>([])
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadSavedUsers()
      setIsLoading(false) // Reset loading state when opening
      if (prefillEmail) {
        setShowLogin(true)
        setEmail(prefillEmail)
      } else {
        setShowLogin(false)
        setEmail("")
      }
      setPassword("")
      setError("")
    } else {
      // Reset everything when closing
      setIsLoading(false)
      setError("")
      setShowLogin(false)
      setEmail("")
      setPassword("")
    }
  }, [open, prefillEmail])

  const loadSavedUsers = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const users: SavedUser[] = JSON.parse(stored)
          // Sort by last login (most recent first) and filter out current user
          const filtered = users
            .filter(u => u.email !== currentUser?.email)
            .sort((a, b) => b.lastLogin - a.lastLogin)
            .slice(0, MAX_SAVED_USERS)
          setSavedUsers(filtered)
        } catch (e) {
          console.error("Error loading saved users:", e)
          setSavedUsers([])
        }
      } else {
        // Try loading from recent users if no saved users
        const recentUsers = getRecentUsers(currentUser?.email)
        setSavedUsers(recentUsers)
      }
    }
  }

  const saveUser = (userInfo: UserInfo) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      let users: SavedUser[] = stored ? JSON.parse(stored) : []
      
      // Remove if already exists
      users = users.filter(u => u.email !== userInfo.email)
      
      // Add new user
      const newUser: SavedUser = {
        email: userInfo.email,
        full_name: userInfo.full_name,
        avatar_url: userInfo.avatar_url,
        lastLogin: Date.now()
      }
      
      users.push(newUser)
      
      // Keep only most recent MAX_SAVED_USERS
      users = users
        .sort((a, b) => b.lastLogin - a.lastLogin)
        .slice(0, MAX_SAVED_USERS)
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
      
      // Also save to recent users (last 2)
      saveRecentUser(newUser)
    }
  }

  const handleSwitchToUser = async (savedUser: SavedUser) => {
    setError("")
    setIsLoading(false) // Don't set loading, just show login form
    setShowLogin(true)
    setEmail(savedUser.email)
    setPassword("") // Clear password field
    // Don't set password - user needs to enter it
    // Focus will be on password field when login form appears
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Login and get token
      await login({ email, password })
      const token = getToken()
      
      if (!token) {
        throw new Error("Token wurde nicht erhalten")
      }

      // Get full user info - use Promise.race with timeout to prevent hanging
      let userInfo: UserInfo
      try {
        const timeoutPromise = new Promise<UserInfo>((_, reject) => {
          setTimeout(() => reject(new Error("Timeout: getUserInfo took too long")), 5000)
        })
        
        userInfo = await Promise.race([
          getCurrentUser(),
          timeoutPromise
        ])
      } catch (err) {
        console.error("Error getting user info:", err)
        // If getCurrentUser fails, try checkAuth instead
        try {
          await checkAuth()
          // Try to get user info again after checkAuth with timeout
          const timeoutPromise = new Promise<UserInfo>((_, reject) => {
            setTimeout(() => reject(new Error("Timeout: getUserInfo after checkAuth took too long")), 5000)
          })
          userInfo = await Promise.race([
            getCurrentUser(),
            timeoutPromise
          ])
        } catch (retryErr) {
          console.error("Retry also failed:", retryErr)
          throw new Error("Benutzerinformationen konnten nicht abgerufen werden. Bitte versuche es erneut.")
        }
      }

      // Save user to saved users list
      saveUser({
        email: userInfo.email,
        full_name: userInfo.full_name,
        avatar_url: userInfo.avatar_url,
        lastLogin: Date.now()
      })
      
      // Save to recent users with token for quick switching
      saveRecentUser({
        email: userInfo.email,
        full_name: userInfo.full_name,
        avatar_url: userInfo.avatar_url,
        lastLogin: Date.now()
      }, token)

      // Ensure auth state is updated (with timeout)
      try {
        const checkAuthPromise = checkAuth()
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error("Timeout")), 3000)
        })
        await Promise.race([checkAuthPromise, timeoutPromise])
      } catch (err) {
        console.warn("checkAuth timeout or error (non-critical):", err)
        // Non-critical - we already have the user info
      }
      
      // Close modal and notify parent immediately
      setIsLoading(false)
      onClose()
      // Call onSwitchUser after a small delay to ensure state updates
      setTimeout(() => {
        onSwitchUser()
      }, 50)
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen")
      setIsLoading(false)
    }
  }

  const getAvatarUrl = (user: SavedUser) => {
    if (user.avatar_url) {
      if (user.avatar_url.startsWith('http')) {
        return user.avatar_url
      }
      return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${user.avatar_url}`
    }
    return null
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffDays === 0) return "Heute"
    if (diffDays === 1) return "Gestern"
    if (diffDays < 7) return `vor ${diffDays} Tagen`
    
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-border dark:border-finsim-dark-border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-finsim-surface dark:bg-finsim-dark-surface border-b border-finsim-borderLight dark:border-finsim-dark-borderLight p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight flex items-center justify-center border border-finsim-primary/30 dark:border-finsim-dark-primary/30">
              <User className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary" />
            </div>
            <h2 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
              Benutzer wechseln
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors"
          >
            <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!showLogin ? (
            <div className="p-4 space-y-4">
              {/* Current User */}
              {currentUser && (
                <div className="mb-6">
                  <p className="text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wide mb-3">
                    Aktueller Benutzer
                  </p>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-finsim-primaryLight/50 dark:bg-finsim-dark-primaryLight/50 border border-finsim-primary/20 dark:border-finsim-dark-primary/20">
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url.startsWith('http') ? currentUser.avatar_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${currentUser.avatar_url}`}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover border border-finsim-border dark:border-finsim-dark-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary flex items-center justify-center border border-finsim-border dark:border-finsim-dark-border">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain truncate">
                        {currentUser.full_name || currentUser.email}
                      </p>
                      <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted truncate">
                        {currentUser.email}
                      </p>
                    </div>
                    <Check className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0" />
                  </div>
                </div>
              )}

              {/* Saved Users */}
              {savedUsers.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wide mb-3">
                    Gespeicherte Benutzer
                  </p>
                  <div className="space-y-2">
                    {savedUsers.map((savedUser, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSwitchToUser(savedUser)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors group border border-finsim-borderLight dark:border-finsim-dark-borderLight hover:border-finsim-border dark:hover:border-finsim-dark-border"
                      >
                        {getAvatarUrl(savedUser) ? (
                          <img
                            src={getAvatarUrl(savedUser)!}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full object-cover border border-finsim-border dark:border-finsim-dark-border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight flex items-center justify-center border border-finsim-border dark:border-finsim-dark-border">
                            <User className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain truncate">
                            {savedUser.full_name || savedUser.email}
                          </p>
                          <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted truncate">
                            {savedUser.email}
                          </p>
                          <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted mt-0.5">
                            {formatDate(savedUser.lastLogin)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-finsim-textMuted dark:text-finsim-dark-textMuted group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Login Button */}
              <button
                onClick={() => setShowLogin(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight hover:bg-finsim-primary/10 dark:hover:bg-finsim-dark-primary/10 transition-colors border border-finsim-primary/20 dark:border-finsim-dark-primary/20"
              >
                <div className="w-10 h-10 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary flex items-center justify-center">
                  <LogIn className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain">
                    Mit anderem Konto anmelden
                  </p>
                  <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                    Neues Konto oder anderer Benutzer
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0" />
              </button>
            </div>
          ) : (
            <div className="p-6">
              <button
                onClick={() => {
                  setShowLogin(false)
                  setEmail("")
                  setPassword("")
                  setError("")
                }}
                className="mb-4 flex items-center gap-2 text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-finsim-textMain dark:hover:text-finsim-dark-textMain transition-colors"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Zurück
              </button>

              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="switch-email">E-Mail</Label>
                  <Input
                    id="switch-email"
                    type="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="switch-password">Passwort</Label>
                  <Input
                    id="switch-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Wird angemeldet..." : "Anmelden"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

