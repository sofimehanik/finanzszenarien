"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { uploadAvatar, updateUserProfile } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Upload, User, Save, Check, Sparkles } from "lucide-react"

interface ProfileSettingsProps {
  open: boolean
  onClose: () => void
  onProfileSaved?: () => void
}

export function ProfileSettings({ open, onClose, onProfileSaved }: ProfileSettingsProps) {
  const { user, checkAuth } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState("")
  const [profession, setProfession] = useState("")
  const [aboutMe, setAboutMe] = useState("")
  const [financialGoals, setFinancialGoals] = useState("")

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "")
      setProfession(user.profession || "")
      setAboutMe(user.about_me || "")
      setFinancialGoals(user.financial_goals || "")
    }
  }, [user])

  if (!open) return null

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError("Bitte wähle eine Bilddatei")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Die Datei ist zu groß (max. 5MB)")
      return
    }

    setIsUploading(true)
    setError("")

    try {
      const result = await uploadAvatar(file)
      await checkAuth() // Refresh user data
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Hochladen")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setError("")
    setSuccess("")
    
    try {
      await updateUserProfile({
        full_name: fullName || undefined,
        profession: profession || undefined,
        about_me: aboutMe || undefined,
        financial_goals: financialGoals || undefined,
      })
      await checkAuth()
      setSuccess("Profil erfolgreich aktualisiert")
      
      // Call callback to refresh suggested questions if financial goals were updated
      if (onProfileSaved) {
        onProfileSaved()
      }
      
      // Close modal after successful save
      setTimeout(() => {
        setSuccess("")
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern")
    } finally {
      setIsSaving(false)
    }
  }

  const getAvatarUrl = () => {
    if (user?.avatar_url) {
      // If avatar_url is a full URL, use it; otherwise prepend API base URL
      if (user.avatar_url.startsWith('http')) {
        return user.avatar_url
      }
      return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${user.avatar_url}`
    }
    return null
  }

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-border dark:border-finsim-dark-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-finsim-surface dark:from-finsim-dark-surface to-finsim-surfaceElevated dark:to-finsim-dark-surfaceElevated border-b border-finsim-borderLight dark:border-finsim-dark-borderLight p-6 flex items-center justify-between backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-finsim-primary/20 dark:from-finsim-dark-primary/20 to-finsim-primary/10 dark:to-finsim-dark-primary/10 flex items-center justify-center border border-finsim-primary/30 dark:border-finsim-dark-primary/30">
              <User className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Profil-Einstellungen</h2>
              <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted mt-0.5">Verwalte deine persönlichen Informationen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-6 pb-6 border-b border-finsim-borderLight">
              <div className="relative group">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-finsim-primary/20 to-finsim-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()!}
                    alt="Avatar"
                    className="relative w-28 h-28 rounded-full object-cover border-4 border-finsim-surface shadow-lg ring-2 ring-finsim-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:ring-finsim-primary/40"
                  />
                ) : (
                  <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-finsim-primaryLight to-finsim-primary/20 flex items-center justify-center border-4 border-finsim-surface shadow-lg ring-2 ring-finsim-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:ring-finsim-primary/40">
                    <User className="h-14 w-14 text-finsim-primary" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-finsim-primary border-4 border-finsim-surface flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-200 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="space-y-2 w-full max-w-xs">
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 border-finsim-borderLight hover:border-finsim-primary/30 hover:bg-finsim-surfaceElevated transition-all duration-200"
                >
                  <Upload className={`h-4 w-4 transition-transform ${isUploading ? 'animate-spin' : ''}`} />
                  {isUploading ? "Wird hochgeladen..." : "Profilbild ändern"}
                </Button>
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-6">
              {/* Email (read-only) */}
              <div className="bg-finsim-surfaceElevated/50 rounded-xl p-4 border border-finsim-borderLight">
                <Label className="text-xs font-medium text-finsim-textSecondary uppercase tracking-wide mb-2 block">E-Mail</Label>
                <div className="text-sm font-medium text-finsim-textMain">{user?.email}</div>
              </div>
              
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full-name" className="text-sm font-semibold text-finsim-textMain">Vollständiger Name</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dein Name"
                  className="h-11 border-finsim-borderLight focus:border-finsim-primary focus:ring-finsim-primary/20 transition-all duration-200"
                />
              </div>

              {/* Profession */}
              <div className="space-y-2">
                <Label htmlFor="profession" className="text-sm font-semibold text-finsim-textMain">Beruf / Profession</Label>
                <Input
                  id="profession"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="z.B. Softwareentwickler, Student, etc."
                  className="h-11 border-finsim-borderLight focus:border-finsim-primary focus:ring-finsim-primary/20 transition-all duration-200"
                />
              </div>

              {/* About Me */}
              <div className="space-y-2">
                <Label htmlFor="about-me" className="text-sm font-semibold text-finsim-textMain">Informationen über dich</Label>
                <textarea
                  id="about-me"
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  placeholder="Zusätzliche Informationen, die bei der Finanzanalyse berücksichtigt werden sollen..."
                  className="w-full min-h-[120px] rounded-lg border border-finsim-borderLight bg-finsim-surfaceElevated py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/20 focus:border-finsim-primary transition-all duration-200 resize-none"
                />
              </div>

              {/* Financial Goals */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-finsim-primary" />
                  <Label htmlFor="financial-goals" className="text-sm font-semibold text-finsim-textMain">Finanzielle Ziele</Label>
                </div>
                <textarea
                  id="financial-goals"
                  value={financialGoals}
                  onChange={(e) => setFinancialGoals(e.target.value)}
                  placeholder="z.B. Eigenheim kaufen, für die Rente sparen, Schulden abbauen, etc. Diese Ziele werden bei der Analyse berücksichtigt."
                  className="w-full min-h-[120px] rounded-lg border border-finsim-borderLight bg-finsim-surfaceElevated py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/20 focus:border-finsim-primary transition-all duration-200 resize-none"
                />
                <p className="text-xs text-finsim-textMuted flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-finsim-primary mt-0.5 flex-shrink-0" />
                  <span>Basierend auf deinen Zielen werden personalisierte Fragen für dich generiert und in den Beispiel-Fragen angezeigt.</span>
                </p>
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 rounded-lg p-3 flex items-start gap-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="w-1 h-full bg-red-500 dark:bg-red-400 rounded-full flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-lg p-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-400 flex-1">{success}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Save Button */}
        <div className="sticky bottom-0 bg-gradient-to-r from-finsim-surface dark:from-finsim-dark-surface to-finsim-surfaceElevated dark:to-finsim-dark-surfaceElevated border-t border-finsim-borderLight dark:border-finsim-dark-borderLight p-6 backdrop-blur-sm">
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="w-full h-12 bg-finsim-primary dark:bg-finsim-dark-primary hover:bg-finsim-primaryHover dark:hover:bg-finsim-dark-primaryHover text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Wird gespeichert...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Profil speichern</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

