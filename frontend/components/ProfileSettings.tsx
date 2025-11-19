"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { uploadAvatar, updateUserProfile, resetUserProfile } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Upload, User, Save, Check, Sparkles, Edit2, Award, Trash2, AlertTriangle } from "lucide-react"

interface ProfileSettingsProps {
  open: boolean
  onClose: () => void
  onProfileSaved?: () => void
  onOpenQuiz?: () => void
}

const QUIZ_FIELD_LABELS: Record<string, { label: string; emoji?: string }> = {
  profession: { label: "Beruf", emoji: "💼" },
  net_income: { label: "Netto-Einkommen", emoji: "💸" },
  fixed_costs: { label: "Fixkosten", emoji: "🏠" },
  main_goal: { label: "Hauptziel", emoji: "🎯" },
  risk_profile: { label: "Risikoprofil", emoji: "🎲" },
  savings_rate: { label: "Sparquote", emoji: "📈" },
  emergency_buffer: { label: "Notgroschen", emoji: "💰" },
}

export function ProfileSettings({ open, onClose, onProfileSaved, onOpenQuiz }: ProfileSettingsProps) {
  const { user, checkAuth } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState("")
  const [profession, setProfession] = useState("")
  const [aboutMe, setAboutMe] = useState("")
  const [financialGoals, setFinancialGoals] = useState("")
  const [editingQuizField, setEditingQuizField] = useState<string | null>(null)
  const [quizValues, setQuizValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "")
      setProfession(user.profession || "")
      setAboutMe(user.about_me || "")
      setFinancialGoals(user.financial_goals || "")
      if (user.quiz_profile) {
        setQuizValues(user.quiz_profile)
      } else {
        setQuizValues({})
      }
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
      await uploadAvatar(file)
      await checkAuth()
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
      const updatedQuizProfile = { ...(user?.quiz_profile || {}), ...quizValues }
      await updateUserProfile({
        full_name: fullName || undefined,
        profession: profession || undefined,
        about_me: aboutMe || undefined,
        financial_goals: financialGoals || undefined,
        quiz_profile: Object.keys(updatedQuizProfile).length > 0 ? updatedQuizProfile : undefined,
      })
      await checkAuth()
      setSuccess("Profil erfolgreich aktualisiert")
      
      if (onProfileSaved) {
        onProfileSaved()
      }
      
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

  const handleQuizFieldEdit = (key: string) => {
    if (editingQuizField === key) {
      // Save
      const updatedQuizProfile = { ...(user?.quiz_profile || {}), ...quizValues }
      setQuizValues(updatedQuizProfile)
      setEditingQuizField(null)
    } else {
      // Start editing
      setEditingQuizField(key)
    }
  }

  const handleQuizFieldCancel = () => {
    setEditingQuizField(null)
    if (user?.quiz_profile) {
      setQuizValues(user.quiz_profile)
    } else {
      setQuizValues({})
    }
  }

  const handleResetProfile = async () => {
    setIsResetting(true)
    setError("")
    setSuccess("")
    
    try {
      await resetUserProfile()
      await checkAuth()
      setSuccess("Profil erfolgreich zurückgesetzt")
      setShowResetConfirm(false)
      
      // Reset local state
      setFullName("")
      setProfession("")
      setAboutMe("")
      setFinancialGoals("")
      setQuizValues({})
      
      if (onProfileSaved) {
        onProfileSaved()
      }
      
      setTimeout(() => {
        setSuccess("")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Zurücksetzen")
    } finally {
      setIsResetting(false)
    }
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

  const quizProfileCompleteness = user?.quiz_profile ? Object.keys(user.quiz_profile).length : 0
  const maxQuizFields = 7
  const completenessPercentage = Math.min((quizProfileCompleteness / maxQuizFields) * 100, 100)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl rounded-3xl bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-border dark:border-finsim-dark-border shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-finsim-textMain dark:text-white tracking-tight">
                    Profil-Einstellungen
                  </h2>
                  <p className="text-sm text-finsim-textMuted dark:text-finsim-dark-textMuted">
                    Verwalte deine persönlichen Informationen
                  </p>
                </div>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted transition-colors"
                >
                  <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
                </motion.button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center space-y-4 pb-6 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
                  <div className="relative group">
                    {getAvatarUrl() ? (
                      <img
                        src={getAvatarUrl()!}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-3 border-finsim-border dark:border-finsim-dark-border shadow-lg transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-finsim-primary to-finsim-accent flex items-center justify-center border-3 border-finsim-border dark:border-finsim-dark-border shadow-lg transition-transform duration-300 group-hover:scale-105">
                        <User className="h-12 w-12 text-white" />
                      </div>
                    )}
                    <motion.button
                      onClick={() => fileInputRef.current?.click()}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary border-2 border-white dark:border-finsim-dark-surface flex items-center justify-center shadow-lg cursor-pointer"
                    >
                      <Upload className="h-4 w-4 text-white" />
                    </motion.button>
                  </div>

                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="hidden"
                  />

                  {/* Profile Completion - Only show if quiz exists */}
                  {user?.quiz_profile && Object.keys(user.quiz_profile).length > 0 && (
                    <div className="w-full max-w-xs space-y-2 rounded-2xl glass-effect border border-white/40 dark:border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
                          <span className="text-sm font-semibold text-finsim-textMain dark:text-white">
                            Profil-Vollständigkeit
                          </span>
                        </div>
                        <span className="text-sm font-bold text-finsim-primary dark:text-finsim-dark-primary tabular-nums">
                          {Math.round(completenessPercentage)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-finsim-surfaceMuted dark:bg-finsim-dark-surfaceMuted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-finsim-primary to-finsim-accent"
                          initial={{ width: 0 }}
                          animate={{ width: `${completenessPercentage}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="space-y-5">
                  {/* Email (read-only) */}
                  <div className="rounded-xl border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated p-4">
                    <p className="text-xs uppercase tracking-wider text-finsim-textMuted dark:text-finsim-dark-textMuted font-semibold mb-1.5">
                      E-Mail
                    </p>
                    <p className="text-base font-semibold text-finsim-textMain dark:text-white break-all">
                      {user?.email}
                    </p>
                  </div>

                  {/* Quiz Profile - Editable */}
                  <div className="rounded-xl border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
                          <p className="text-sm font-semibold text-finsim-textMain dark:text-white">
                            Finanzprofil (Quiz)
                          </p>
                        </div>
                        <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                          Personalisiere deine Finanzempfehlungen
                        </p>
                      </div>
                      {onOpenQuiz && (
                        <button
                          onClick={() => onOpenQuiz()}
                          className="text-xs font-medium text-finsim-primary dark:text-finsim-dark-primary hover:underline px-3 py-1.5 rounded-lg hover:bg-finsim-primaryLight dark:hover:bg-finsim-dark-primaryLight transition-colors"
                        >
                          {user?.quiz_profile ? "Quiz erneut starten" : "Quiz starten"}
                        </button>
                      )}
                    </div>
                    {user?.quiz_profile && Object.keys(user.quiz_profile).length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {Object.entries(user.quiz_profile).map(([key, value]) => {
                          const fieldInfo = QUIZ_FIELD_LABELS[key] || { label: key }
                          const isEditing = editingQuizField === key
                          const currentValue = isEditing ? (quizValues[key] || value) : (quizValues[key] !== undefined ? quizValues[key] : value)
                          return (
                            <div
                              key={key}
                              className="relative rounded-lg border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface p-3 hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors group"
                            >
                              {!isEditing ? (
                                <>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {fieldInfo.emoji && (
                                        <span className="text-base flex-shrink-0">{fieldInfo.emoji}</span>
                                      )}
                                      <p className="text-xs uppercase tracking-wider text-finsim-textMuted dark:text-finsim-dark-textMuted font-semibold truncate">
                                        {fieldInfo.label}
                                      </p>
                                    </div>
                                    <motion.button
                                      onClick={() => handleQuizFieldEdit(key)}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="p-1.5 rounded-md hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
                                    </motion.button>
                                  </div>
                                  <p className="text-sm font-semibold text-finsim-textMain dark:text-white leading-snug">
                                    {currentValue}
                                  </p>
                                </>
                              ) : (
                                <div className="space-y-2">
                                  <Input
                                    value={currentValue}
                                    onChange={(e) => setQuizValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleQuizFieldEdit(key)
                                      } else if (e.key === 'Escape') {
                                        handleQuizFieldCancel()
                                      }
                                    }}
                                    autoFocus
                                    className="text-sm font-semibold h-9"
                                  />
                                  <div className="flex items-center gap-2 text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                                    <span>Enter zum Speichern, Esc zum Abbrechen</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-finsim-borderLight dark:border-finsim-dark-borderLight p-4 text-center">
                        <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                          Noch kein Quiz ausgefüllt. Starte das Quiz, um personalisierte Tipps zu erhalten.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full-name" className="text-sm font-semibold text-finsim-textMain dark:text-white">
                        Vollständiger Name
                      </Label>
                      <Input
                        id="full-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Name"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profession" className="text-sm font-semibold text-finsim-textMain dark:text-white">
                        Beruf / Profession
                      </Label>
                      <Input
                        id="profession"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="z.B. Entwickler, Student ..."
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* About Me */}
                  <div className="space-y-2">
                    <Label htmlFor="about-me" className="text-sm font-semibold text-finsim-textMain dark:text-white">
                      Informationen über dich
                    </Label>
                    <textarea
                      id="about-me"
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      placeholder="Kurz notieren, was wir berücksichtigen sollen."
                      className="w-full min-h-[100px] rounded-xl border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/20 focus:border-finsim-primary transition-all resize-none"
                    />
                  </div>

                  {/* Financial Goals */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
                      <Label htmlFor="financial-goals" className="text-sm font-semibold text-finsim-textMain dark:text-white">
                        Finanzielle Ziele
                      </Label>
                    </div>
                    <textarea
                      id="financial-goals"
                      value={financialGoals}
                      onChange={(e) => setFinancialGoals(e.target.value)}
                      placeholder="Konkrete Ziele (Betrag + Zeitraum) eintragen."
                      className="w-full min-h-[100px] rounded-xl border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/20 focus:border-finsim-primary transition-all resize-none"
                    />
                    <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted flex items-start gap-1.5">
                      <Sparkles className="h-3 w-3 text-finsim-primary mt-0.5 flex-shrink-0" />
                      <span>Knackige Ziele liefern genauere KI-Empfehlungen.</span>
                    </p>
                  </div>

                  {/* Messages */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 flex items-start gap-3"
                      >
                        <div className="w-1 h-full bg-red-500 dark:bg-red-400 rounded-full flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
                      </motion.div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4 flex items-center gap-3"
                      >
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <p className="text-sm text-green-700 dark:text-green-400 flex-1">{success}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer with Save Button */}
            <div className="p-6 border-t border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated space-y-3">
              <motion.button
                onClick={handleSaveProfile}
                disabled={isSaving || isResetting}
                whileHover={{ scale: isSaving || isResetting ? 1 : 1.01 }}
                whileTap={{ scale: isSaving || isResetting ? 1 : 0.99 }}
                className="w-full h-12 rounded-xl bg-finsim-primary dark:bg-finsim-dark-primary hover:bg-finsim-primaryHover dark:hover:bg-finsim-dark-primaryHover text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Wird gespeichert...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Profil speichern</span>
                  </>
                )}
              </motion.button>
              
              {/* Reset Button */}
              <motion.button
                onClick={() => setShowResetConfirm(true)}
                disabled={isSaving || isResetting}
                whileHover={{ scale: isSaving || isResetting ? 1 : 1.01 }}
                whileTap={{ scale: isSaving || isResetting ? 1 : 0.99 }}
                className="w-full h-11 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Profil zurücksetzen</span>
              </motion.button>
            </div>
            
            {/* Reset Confirmation Modal */}
            <AnimatePresence>
              {showResetConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                  onClick={() => setShowResetConfirm(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative w-full max-w-md rounded-2xl bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-border dark:border-finsim-dark-border shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
                          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <h3 className="text-lg font-bold text-finsim-textMain dark:text-white">
                            Profil zurücksetzen?
                          </h3>
                          <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                            Alle deine Profildaten werden gelöscht:
                          </p>
                          <ul className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary space-y-1 list-disc list-inside">
                            <li>Quiz-Profil und alle Antworten</li>
                            <li>Persönliche Informationen</li>
                            <li>Finanzziele</li>
                            <li>Profilbild</li>
                          </ul>
                          <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted pt-2">
                            Dein Account, E-Mail und Passwort bleiben erhalten.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <motion.button
                          onClick={handleResetProfile}
                          disabled={isResetting}
                          whileHover={{ scale: isResetting ? 1 : 1.02 }}
                          whileTap={{ scale: isResetting ? 1 : 0.98 }}
                          className="flex-1 h-10 rounded-xl bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isResetting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Wird zurückgesetzt...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              <span>Zurücksetzen</span>
                            </>
                          )}
                        </motion.button>
                        <motion.button
                          onClick={() => setShowResetConfirm(false)}
                          disabled={isResetting}
                          whileHover={{ scale: isResetting ? 1 : 1.02 }}
                          whileTap={{ scale: isResetting ? 1 : 0.98 }}
                          className="flex-1 h-10 rounded-xl bg-finsim-surfaceMuted dark:bg-finsim-dark-surfaceMuted hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated text-finsim-textMain dark:text-finsim-dark-textMain font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Abbrechen
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
