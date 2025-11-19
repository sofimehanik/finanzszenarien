"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { User, LogOut, Mail, Moon, Sun, Users, Sparkles, ShieldCheck } from "lucide-react"
import { SwitchUserModal } from "./SwitchUserModal"
import { QuickUserSwitch } from "./QuickUserSwitch"
import { motion, AnimatePresence } from "framer-motion"

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
      {/* Avatar Button - Minimalist Design */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group/menu flex items-center gap-2.5 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 transition-all duration-200 p-1.5 pr-3 hover:bg-white/80 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-finsim-primary/30"
        aria-label="User menu"
      >
        {getAvatarUrl() ? (
          <img
            src={getAvatarUrl()!}
            alt="Avatar"
            className="w-8 h-8 rounded-lg object-cover border border-white/50 dark:border-white/10"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-finsim-primary/20 to-finsim-accent/20 dark:from-finsim-dark-primary/30 dark:to-finsim-dark-accent/30 flex items-center justify-center border border-white/40 dark:border-white/10">
            <User className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
          </div>
        )}
        <div className="text-left min-w-0">
          <p className="text-xs font-medium text-finsim-textMain dark:text-white leading-tight truncate">
            {user.full_name || user.email.split("@")[0]}
          </p>
          <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted truncate">Konto</p>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
      {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-14 w-72 rounded-2xl bg-white/95 dark:bg-[#12131a]/95 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.18)] z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/40 dark:border-white/5 bg-gradient-to-br from-finsim-primary/10 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/50 dark:bg-white/10 flex items-center justify-center shadow-inner border border-white/60">
                  {getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()!}
                      alt="Avatar"
                      className="w-11 h-11 rounded-2xl object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-finsim-textMain dark:text-white truncate">{user.full_name || "Willkommen"}</p>
                  <p className="text-xs text-finsim-textMuted dark:text-white/60 truncate">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-finsim-textMuted dark:text-white/50">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Finanzdaten sind sicher verschlüsselt</span>
          </div>
          </div>

            {/* Aktionen */}
            <div className="p-3 space-y-2">
            <button
              onClick={() => {
                onOpenProfile()
                setIsOpen(false)
              }}
                className="w-full rounded-xl p-3.5 bg-finsim-primaryLight/40 dark:bg-finsim-dark-primaryLight/30 border border-white/40 dark:border-white/10 flex items-center gap-3 hover:-translate-y-[1px] transition-all duration-200 shadow-sm"
            >
                <div className="w-9 h-9 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center">
                <User className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
              </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-finsim-textMain dark:text-white">Profil öffnen</p>
                  <p className="text-xs text-finsim-textMuted dark:text-white/60">Persönliche Daten & Ziele</p>
              </div>
                <Sparkles className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
            </button>

            <button
              onClick={toggleTheme}
                className="rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3 flex items-center justify-between hover:bg-white/80 dark:hover:bg-white/10 transition-all"
            >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white to-finsim-primary/10 dark:from-white/5 dark:to-white/0 flex items-center justify-center">
                {isDark ? (
                      <Sun className="h-4 w-4 text-finsim-primary dark:text-white" />
                ) : (
                      <Moon className="h-4 w-4 text-finsim-primary dark:text-white" />
                )}
              </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-finsim-textMain dark:text-white">Theme wechseln</p>
                    <p className="text-[11px] text-finsim-textMuted dark:text-white/60">{isDark ? "Dunkel" : "Hell"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-finsim-textMuted dark:text-white/60">
                  {isDark ? "🌙" : "☀️"}
                  <div className="relative w-14 h-7 bg-white/70 dark:bg-white/10 rounded-full border border-white/60 dark:border-white/20">
                    <motion.div
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white dark:bg-[#1a1b23] shadow-lg"
                      animate={{ x: isDark ? 32 : 2 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                </div>
              </div>
            </button>

              <div className="rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white to-finsim-primary/10 dark:from-white/5 dark:to-white/0 flex items-center justify-center">
                      <Users className="h-4 w-4 text-finsim-primary dark:text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-finsim-textMain dark:text-white">Konto wechseln</p>
                      <p className="text-[11px] text-finsim-textMuted dark:text-white/60">Zuletzt genutzte Profile</p>
                    </div>
                  </div>
            <button
              onClick={() => {
                setShowSwitchUser(true)
                setIsOpen(false)
              }}
                    className="text-[11px] font-medium text-finsim-primary dark:text-white hover:underline"
            >
                    Login
                  </button>
              </div>
                <QuickUserSwitch
                  onSwitch={(userEmail) => {
                    setIsOpen(false)
                    setSwitchUserEmail(userEmail)
                    setShowSwitchUser(true)
                  }}
                />
              </div>
          </div>

            {/* Footer */}
            <div className="border-t border-white/30 dark:border-white/5">
          <button
            onClick={handleLogout}
                className="w-full px-4 py-3 flex items-center gap-3 text-left text-red-500 hover:bg-red-50/80 dark:hover:bg-red-500/10 transition-colors"
          >
                <div className="w-8 h-8 rounded-full bg-red-100/80 dark:bg-red-500/20 flex items-center justify-center">
              <LogOut className="h-4 w-4" />
            </div>
                <div>
                  <p className="text-sm font-semibold">Abmelden</p>
                  <p className="text-[11px] text-red-500/70">Sichere Sitzung beenden</p>
            </div>
          </button>
        </div>
          </motion.div>
      )}
      </AnimatePresence>

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

