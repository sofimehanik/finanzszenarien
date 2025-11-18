"use client"

import { useState } from "react"
import { login, register, getCurrentUser, getToken } from "@/lib/api"
import { saveRecentUser } from "@/lib/userStorage"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, X } from "lucide-react"

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")

  if (!open) return null

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login({ email, password })
      // Get token and full user info, then save to recent users
      const token = getToken()
      try {
        const userInfo = await getCurrentUser()
        saveRecentUser({
          email: userInfo.email,
          full_name: userInfo.full_name,
          avatar_url: userInfo.avatar_url,
          lastLogin: Date.now()
        }, token || undefined)
      } catch (err) {
        console.error("Error saving recent user:", err)
      }
      setIsLoading(false)
      // Clear form first
      setEmail("")
      setPassword("")
      setFullName("")
      setError("")
      // Then call onSuccess which will trigger checkAuth
      // Use setTimeout to avoid race conditions
      setTimeout(() => {
        onSuccess()
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen")
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein")
      setIsLoading(false)
      return
    }

    try {
      await register({ email, password, full_name: fullName || undefined })
      setIsLoading(false)
      // Clear form first
      setEmail("")
      setPassword("")
      setFullName("")
      setError("")
      // Then call onSuccess which will trigger checkAuth
      // Use setTimeout to avoid race conditions
      setTimeout(() => {
        onSuccess()
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrierung fehlgeschlagen")
      setIsLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as "login" | "register")
    setError("")
    setEmail("")
    setPassword("")
    setFullName("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-border dark:border-finsim-dark-border rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-finsim-surface dark:bg-finsim-dark-surface border-b border-finsim-borderLight dark:border-finsim-dark-borderLight p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">Anmelden / Registrieren</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors"
          >
            <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
          </button>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="register">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-Mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Passwort</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Lädt..." : "Anmelden"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="register-name">Name (optional)</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Max Mustermann"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-email">E-Mail</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password">Passwort</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Mindestens 6 Zeichen"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Lädt..." : "Registrieren"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

