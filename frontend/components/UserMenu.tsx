"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { User, Settings, LogOut, Mail, Moon, Sun, Users } from "lucide-react"
import { SwitchUserModal } from "./SwitchUserModal"
import { QuickUserSwitch } from "./QuickUserSwitch"

interface UserMenuProps {
  onOpenProfile: () => void
}

export function UserMenu({ onOpenProfile }: UserMenuProps) {
  const { user, logout, checkAuth } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [showSwitchUser, setShowSwitchUser] = useState(false)
  const [switchUserEmail, setSwitchUserEmail] = useState<string | undefined>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load theme from localStorage on mount - default to light theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      const shouldBeDark = savedTheme === 'dark' // Only use dark if explicitly set
      setIsDark(shouldBeDark)
      // Remove dark class if not needed, ensure light theme by default
      if (shouldBeDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
        // Ensure light theme is set if no preference
        if (!savedTheme) {
          localStorage.setItem('theme', 'light')
        }
      }
    }
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    document.documentElement.classList.toggle('dark', newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
  }

  const handleLogout = () => {
    logout()
    setIsOpen(false)
  }

  const getAvatarUrl = () => {
    if (user?.avatar_url) {
      if (user.avatar_url.startsWith('http')) {
        return user.avatar_url
      }
      return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${user.avatar_url}`
    }
    return null
  }

  if (!user) return null

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-finsim-primary/20"
        aria-label="User menu"
      >
        {getAvatarUrl() ? (
          <img
            src={getAvatarUrl()!}
            alt="Avatar"
            className="w-8 h-8 rounded-full object-cover border border-finsim-border dark:border-finsim-dark-border"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight flex items-center justify-center border border-finsim-border dark:border-finsim-dark-border">
            <User className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-64 bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-border dark:border-finsim-dark-border rounded-xl shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden">
          {/* Quick User Switch */}
          <div className="px-4 pt-3 pb-2 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <QuickUserSwitch onSwitch={(userEmail) => {
              setIsOpen(false)
              setSwitchUserEmail(userEmail)
              setShowSwitchUser(true)
            }} />
          </div>

          {/* Email Section */}
          <div className="px-4 py-3 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <div className="flex items-center gap-2 text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted mb-1">
              <Mail className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wide font-medium">E-Mail</span>
            </div>
            <p className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain truncate">
              {user.email}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Profile */}
            <button
              onClick={() => {
                onOpenProfile()
                setIsOpen(false)
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight flex items-center justify-center group-hover:bg-finsim-primary/10 dark:group-hover:bg-finsim-dark-primary/10 transition-colors">
                <User className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain">Profil</p>
                <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">Persönliche Informationen</p>
              </div>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight flex items-center justify-center group-hover:bg-finsim-primary/10 dark:group-hover:bg-finsim-dark-primary/10 transition-colors">
                {isDark ? (
                  <Sun className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
                ) : (
                  <Moon className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
                )}
              </div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain">Thema</p>
                  <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                    {isDark ? 'Dunkel' : 'Hell'}
                  </p>
                </div>
                <div className="relative w-11 h-6 bg-finsim-borderLight dark:bg-finsim-dark-borderLight rounded-full transition-colors">
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-finsim-dark-surface rounded-full shadow-md transition-transform duration-200 ${
                      isDark ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </button>

            {/* Switch User */}
            <button
              onClick={() => {
                setShowSwitchUser(true)
                setIsOpen(false)
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight flex items-center justify-center group-hover:bg-finsim-primary/10 dark:group-hover:bg-finsim-dark-primary/10 transition-colors">
                <Users className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain">Benutzer wechseln</p>
                <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">Anderes Konto verwenden</p>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-finsim-borderLight dark:border-finsim-dark-borderLight" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors group text-red-600 dark:text-red-400"
          >
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-950/40 transition-colors">
              <LogOut className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Abmelden</p>
            </div>
          </button>
        </div>
      )}

      {/* Switch User Modal */}
      <SwitchUserModal
        open={showSwitchUser}
        onClose={() => {
          setShowSwitchUser(false)
          setSwitchUserEmail(undefined)
        }}
        onSwitchUser={async () => {
          await checkAuth()
          setSwitchUserEmail(undefined)
        }}
        prefillEmail={switchUserEmail}
      />
    </div>
  )
}

