"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { login, getCurrentUser, setToken } from "@/lib/api"
import { getRecentUsers, saveRecentUser, getRecentUserToken, SavedUser } from "@/lib/userStorage"
import { User, Loader2 } from "lucide-react"

interface QuickUserSwitchProps {
  onSwitch: (userEmail?: string) => void
}

export function QuickUserSwitch({ onSwitch }: QuickUserSwitchProps) {
  const { user: currentUser, checkAuth } = useAuth()
  const [recentUsers, setRecentUsers] = useState<SavedUser[]>([])
  const [isSwitching, setIsSwitching] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (currentUser) {
      const users = getRecentUsers(currentUser.email)
      setRecentUsers(users)
      setIsVisible(users.length > 0)
    } else {
      setIsVisible(false)
    }
    // Reset switching state when user changes
    setIsSwitching(null)
  }, [currentUser])

  const handleSwitch = async (targetUser: SavedUser) => {
    if (isSwitching) return

    setIsSwitching(targetUser.email)
    
    // Try to get cached token for quick switch
    const cachedToken = getRecentUserToken(targetUser.email)
    
    if (cachedToken) {
      // Quick switch using cached token
      try {
        setToken(cachedToken)
        
        // Verify token is valid by checking auth
        await checkAuth()
        
        // Small delay to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 100))
        
        setIsSwitching(null)
        return
      } catch (error) {
        console.error("Quick switch failed, token might be expired:", error)
        // Token might be expired, remove it and fall through to login modal
        const tokensStored = sessionStorage.getItem('finsim_recent_tokens')
        if (tokensStored) {
          try {
            const tokens: Record<string, string> = JSON.parse(tokensStored)
            delete tokens[targetUser.email]
            sessionStorage.setItem('finsim_recent_tokens', JSON.stringify(tokens))
          } catch (e) {
            console.error("Error removing expired token:", e)
          }
        }
        // Fall through to login modal
      }
    }
    
    // If no cached token or token expired, open login modal
    setIsSwitching(null)
    onSwitch(targetUser.email)
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

  if (!isVisible || recentUsers.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight">
      {recentUsers.map((recentUser, idx) => (
        <button
          key={recentUser.email}
          onClick={() => handleSwitch(recentUser)}
          disabled={isSwitching === recentUser.email}
          className={`
            relative flex items-center gap-2 px-3 py-1.5 rounded-md
            transition-all duration-300 ease-out
            ${isSwitching === recentUser.email
              ? 'bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight cursor-wait'
              : 'hover:bg-finsim-surface dark:hover:bg-finsim-dark-surface cursor-pointer'
            }
            ${idx === 0 ? 'animate-in fade-in-0 slide-in-from-right-2' : 'animate-in fade-in-0 slide-in-from-right-4 delay-75'}
          `}
          style={{
            animationDuration: '300ms',
            animationFillMode: 'both'
          }}
        >
          {isSwitching === recentUser.email ? (
            <Loader2 className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary animate-spin" />
          ) : getAvatarUrl(recentUser) ? (
            <img
              src={getAvatarUrl(recentUser)!}
              alt={recentUser.full_name || recentUser.email}
              className="w-6 h-6 rounded-full object-cover border border-finsim-border dark:border-finsim-dark-border"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight flex items-center justify-center border border-finsim-border dark:border-finsim-dark-border">
              <User className="h-3.5 w-3.5 text-finsim-primary dark:text-finsim-dark-primary" />
            </div>
          )}
          <span className="text-xs font-medium text-finsim-textMain dark:text-finsim-dark-textMain truncate max-w-[100px]">
            {recentUser.full_name || recentUser.email.split('@')[0]}
          </span>
        </button>
      ))}
    </div>
  )
}

