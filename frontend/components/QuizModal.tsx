"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight, ArrowLeft, Sparkles, Trophy, Award, TrendingUp, CheckCircle2 } from "lucide-react"
import { saveQuizProfile } from "@/lib/api"

const QUIZ_FIELD_EMOJIS: Record<string, string> = {
  profession: "💼",
  net_income: "💸",
  fixed_costs: "🏠",
  main_goal: "🎯",
  risk_profile: "🎲",
  savings_rate: "📈",
  emergency_buffer: "💰",
}

type QuizOption = {
  value: string
  label: string
  description?: string
  emoji?: string
}

type QuizStep = {
  key: string
  title: string
  subtitle: string
  options: QuizOption[]
  allowCustom?: boolean
  customPlaceholder?: string
}

const QUIZ_STEPS: QuizStep[] = [
  {
    key: "profession",
    title: "Was machst du beruflich?",
    subtitle: "Hilf uns, deine Situation besser einzuordnen.",
    options: [
      { value: "Angestellt", label: "Angestellt", emoji: "💼" },
      { value: "Selbstständig", label: "Selbstständig", emoji: "🚀" },
      { value: "Student:in", label: "Student:in", emoji: "📚" },
      { value: "Ausbildung", label: "Ausbildung", emoji: "🛠️" },
      { value: "In Transition", label: "Jobwechsel / Pause", emoji: "🌱" },
    ],
    allowCustom: true,
    customPlaceholder: "Berufsbezeichnung eingeben …",
  },
  {
    key: "net_income",
    title: "Wie hoch ist dein Netto-Monatseinkommen?",
    subtitle: "Schätze grob – wir brauchen nur eine Range.",
    options: [
      { value: "<1500 €", label: "< 1.500 €", emoji: "🌱" },
      { value: "1500-2500 €", label: "1.500 - 2.500 €", emoji: "🌿" },
      { value: "2500-3500 €", label: "2.500 - 3.500 €", emoji: "🌳" },
      { value: "3500-5000 €", label: "3.500 - 5.000 €", emoji: "🌲" },
      { value: ">5000 €", label: "> 5.000 €", emoji: "🌏" },
    ],
  },
  {
    key: "fixed_costs",
    title: "Wie hoch sind deine fixen Ausgaben pro Monat?",
    subtitle: "Miete, Versicherungen, Abos … grob reicht.",
    options: [
      { value: "<1000 €", label: "< 1.000 €", emoji: "🏠" },
      { value: "1000-1500 €", label: "1.000 - 1.500 €", emoji: "🏡" },
      { value: "1500-2000 €", label: "1.500 - 2.000 €", emoji: "🏙️" },
      { value: ">2000 €", label: "> 2.000 €", emoji: "🌆" },
    ],
  },
  {
    key: "main_goal",
    title: "Was ist dein aktuelles Hauptziel?",
    subtitle: "Wähle, was dir gerade am wichtigsten ist.",
    options: [
      { value: "Notgroschen", label: "Notgroschen aufbauen", emoji: "🛟" },
      { value: "Reise/Erlebnis", label: "Reise oder Erlebnis planen", emoji: "✈️" },
      { value: "Investition", label: "Langfristig investieren", emoji: "📈" },
      { value: "Schuldenfreiheit", label: "Schulden reduzieren", emoji: "🧾" },
      { value: "Lifestyle", label: "Mehr finanzieller Spielraum", emoji: "🎯" },
    ],
  },
  {
    key: "risk_profile",
    title: "Welche Risikobereitschaft passt zu dir?",
    subtitle: "Sei ehrlich – es gibt kein richtig oder falsch.",
    options: [
      { value: "konservativ", label: "Konservativ", description: "Sicherheit vor Rendite", emoji: "🛡️" },
      { value: "ausgewogen", label: "Ausgewogen", description: "Balance aus Chance & Risiko", emoji: "⚖️" },
      { value: "dynamisch", label: "Dynamisch", description: "Mutig & wachstumsorientiert", emoji: "⚡️" },
    ],
  },
  {
    key: "savings_rate",
    title: "Wie viel sparst du aktuell?",
    subtitle: "Gib die ungefähre Sparquote an.",
    options: [
      { value: "<5%", label: "< 5 %", emoji: "🌀" },
      { value: "5-10%", label: "5 - 10 %", emoji: "🌤️" },
      { value: "10-20%", label: "10 - 20 %", emoji: "🌤️" },
      { value: ">20%", label: "> 20 %", emoji: "☀️" },
    ],
  },
  {
    key: "emergency_buffer",
    title: "Wie viele Monate könntest du mit Rücklagen überbrücken?",
    subtitle: "Schätze deine finanzielle Notfall-Reserve.",
    options: [
      { value: "<1 Monat", label: "< 1 Monat", emoji: "⏳" },
      { value: "1-3 Monate", label: "1 - 3 Monate", emoji: "🪙" },
      { value: "3-6 Monate", label: "3 - 6 Monate", emoji: "💰" },
      { value: ">6 Monate", label: "> 6 Monate", emoji: "🏦" },
    ],
  },
]

type QuizModalProps = {
  open: boolean
  onClose: () => void
  onCompleted: () => void
  existingProfile?: Record<string, string>
  defaultProfession?: string
}

export function QuizModal({ open, onClose, onCompleted, existingProfile, defaultProfession }: QuizModalProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [customProfession, setCustomProfession] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showAchievement, setShowAchievement] = useState(false)

  useEffect(() => {
    if (open) {
      setStepIndex(0)
      setError("")
      setIsSubmitting(false)
      setCustomProfession(existingProfile?.profession || defaultProfession || "")
      setAnswers(existingProfile ? { ...existingProfile } : defaultProfession ? { profession: defaultProfession } : {})
    }
  }, [open, existingProfile, defaultProfession])

  const summaryItems = useMemo(() => {
    return QUIZ_STEPS.map((step) => ({
      key: step.key,
      title: step.title,
      answer: answers[step.key],
    })).filter((item) => item.answer)
  }, [answers])

  if (!open) return null

  const isSummary = stepIndex >= QUIZ_STEPS.length
  const progress = Math.min((stepIndex / QUIZ_STEPS.length) * 100, 100)
  const currentStep = QUIZ_STEPS[stepIndex]

  const handleSelect = (value: string) => {
    if (!currentStep) return
    setAnswers((prev) => ({
      ...prev,
      [currentStep.key]: value,
    }))
    setError("")
  }

  const handleNext = () => {
    if (!currentStep) return
    if (!answers[currentStep.key]) {
      setError("Bitte wähle eine Antwort aus.")
      return
    }
    setStepIndex((prev) => prev + 1)
  }

  const handleBack = () => {
    if (isSubmitting) return
    if (stepIndex === 0) {
      onClose()
      return
    }
    setStepIndex((prev) => prev - 1)
    setError("")
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError("")
    try {
      await saveQuizProfile({
        quiz_profile: answers,
        profession: answers.profession || customProfession || undefined,
      })
      
      // Check if this is the first time completing the quiz
      const hasCompletedBefore = localStorage.getItem('quiz_completed')
      if (!hasCompletedBefore) {
        localStorage.setItem('quiz_completed', 'true')
        setShowAchievement(true)
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowAchievement(false)
        }, 5000)
      }
      
      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz konnte nicht gespeichert werden.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="quiz-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        >
          <motion.div
            key="quiz-modal-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-xl rounded-[32px] glass-effect premium-shadow overflow-hidden border border-white/40 dark:border-white/10 max-h-[90vh] flex flex-col"
          >
          {/* Static background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-finsim-primary/8 via-transparent to-finsim-accent/6 pointer-events-none" />
          
          <div className="relative p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-finsim-primaryLight/40 dark:bg-finsim-dark-primaryLight/30 border border-finsim-primary/20 dark:border-finsim-dark-primary/20">
                  <Sparkles className="h-3 w-3 text-finsim-primary dark:text-finsim-dark-primary" />
                  <span className="text-[9px] font-semibold text-finsim-primary dark:text-finsim-dark-primary tracking-[0.2em] uppercase">
                    FinSim Quiz
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-finsim-textMain dark:text-white leading-[1.1]">
                  Dein Finanzprofil
                  <br />
                  <span className="bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent bg-clip-text text-transparent">
                    in 60 Sekunden
                  </span>
                </h3>
                <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                  Schnell, einfach, personalisiert – für bessere Finanzempfehlungen.
                </p>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="p-2.5 rounded-full glass-effect border border-white/40 dark:border-white/10 text-finsim-textSecondary dark:text-white/70 hover:text-finsim-textMain dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Progress Bar */}
            {!isSummary && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium">
                    Fortschritt
                  </span>
                  <span className="text-finsim-textMain dark:text-white font-semibold tabular-nums">
                    {stepIndex + 1} / {QUIZ_STEPS.length}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/40 dark:bg-white/5 overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-finsim-primary via-finsim-primary/90 to-finsim-accent shadow-lg"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              </div>
            )}

            {!isSummary && currentStep && (
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-finsim-primaryLight/30 dark:bg-finsim-dark-primaryLight/20">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-finsim-primary dark:text-finsim-dark-primary font-bold">
                      Frage {stepIndex + 1}
                    </span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-finsim-textMain dark:text-white leading-tight">
                    {currentStep.title}
                  </h4>
                  <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                    {currentStep.subtitle}
                  </p>
                </div>

                {currentStep.allowCustom && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <input
                      value={answers.profession || customProfession}
                      onChange={(e) => {
                        setCustomProfession(e.target.value)
                        setAnswers((prev) => ({ ...prev, profession: e.target.value }))
                        setError("")
                      }}
                      placeholder={currentStep.customPlaceholder}
                      className="w-full rounded-2xl border border-white/60 dark:border-white/15 glass-effect px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 dark:focus:ring-finsim-dark-primary/40 focus:border-finsim-primary dark:focus:border-finsim-dark-primary transition-all placeholder:text-finsim-textMuted/50 dark:placeholder:text-white/30"
                    />
                  </motion.div>
                )}

                <div className="grid sm:grid-cols-2 gap-2.5">
                  {currentStep.options.map((option, idx) => {
                    const isSelected = answers[currentStep.key] === option.value
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03, duration: 0.15 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`text-left rounded-2xl border p-4 glass-effect transition-all duration-300 ${
                          isSelected
                            ? "border-finsim-primary dark:border-finsim-dark-primary bg-finsim-primaryLight/30 dark:bg-finsim-dark-primaryLight/20 text-finsim-textMain dark:text-white shadow-lg shadow-finsim-primary/20"
                            : "border-white/60 dark:border-white/15 bg-white/50 dark:bg-white/5 text-finsim-textSecondary dark:text-white/70 hover:border-white/80 dark:hover:border-white/25 hover:bg-white/60 dark:hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {option.emoji && (
                            <span className="text-xl leading-none flex-shrink-0">{option.emoji}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-snug">{option.label}</p>
                            {option.description && (
                              <p className="text-xs text-finsim-textMuted dark:text-white/60 mt-1 leading-relaxed">
                                {option.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 dark:text-red-400 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20"
                  >
                    <X className="h-4 w-4" />
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}

            {isSummary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-2.5"
              >
                {/* Header with Trophy */}
                <div className="flex flex-col items-center text-center space-y-1.5 pb-1">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-finsim-primary to-finsim-accent flex items-center justify-center text-white shadow-lg">
                      <Trophy className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-finsim-textMain dark:text-white">
                      Dein Profil
                    </h3>
                    <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                      Alles klar! 🎉 Dein Finanzprofil ist bereit.
                    </p>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="rounded-2xl glass-effect border border-white/40 dark:border-white/10 p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Sparkles className="h-3 w-3 text-finsim-primary dark:text-finsim-dark-primary" />
                    <h4 className="text-xs font-medium text-finsim-textMain dark:text-white uppercase tracking-wider">
                      Dein Ergebnis
                    </h4>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {summaryItems.map((item) => {
                      const emoji = QUIZ_FIELD_EMOJIS[item.key] || '✨'
                      
                      return (
                        <div
                          key={item.key}
                          className="rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5 p-2.5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors cursor-default"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base flex-shrink-0 leading-none">{emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-finsim-textMuted dark:text-white/50 font-medium mb-1">
                                {item.title}
                              </p>
                              <p className="text-xs font-medium text-finsim-textMain dark:text-white leading-snug">
                                {item.answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 dark:text-red-400 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20"
                  >
                    <X className="h-4 w-4" />
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}

          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between p-4 sm:p-5 pt-3 border-t border-white/30 dark:border-white/10 bg-gradient-to-b from-transparent to-white/20 dark:to-white/5">
            <motion.button
              onClick={handleBack}
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-effect border border-white/40 dark:border-white/10 text-sm font-medium text-finsim-textSecondary dark:text-white/70 hover:text-finsim-textMain dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </motion.button>

            {!isSummary ? (
              <motion.button
                onClick={handleNext}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="inline-flex items-center gap-2 rounded-xl bg-finsim-textMain dark:bg-finsim-dark-primary text-white px-6 py-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Weiter
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent text-white px-6 py-2 text-sm font-medium shadow-xl hover:shadow-2xl disabled:opacity-60 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Speichere ...
                  </>
                ) : (
                  <>
                    Profil speichern
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
        </motion.div>
      )}

      {/* Achievement Popup */}
      <AnimatePresence>
        {showAchievement && (
          <motion.div
            key="achievement-popup"
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-[90]"
          >
            <motion.div
              className="rounded-2xl glass-effect premium-shadow border border-white/40 dark:border-white/10 p-5 max-w-xs space-y-3 bg-gradient-to-br from-emerald-50/80 via-white/80 to-blue-50/80 dark:from-emerald-500/20 dark:via-white/10 dark:to-blue-500/20"
              animate={{
                boxShadow: [
                  "0 20px 40px rgba(76, 111, 255, 0.2)",
                  "0 20px 50px rgba(76, 111, 255, 0.3)",
                  "0 20px 40px rgba(76, 111, 255, 0.2)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-finsim-primary to-finsim-accent flex items-center justify-center text-white shadow-lg flex-shrink-0"
                >
                  <Award className="h-6 w-6" />
                </motion.div>
                <div className="flex-1 space-y-1">
                  <motion.h4
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-base font-semibold text-finsim-textMain dark:text-white"
                  >
                    Erste Schritte! 🎉
                  </motion.h4>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed"
                  >
                    Du hast dein Finanzprofil erstellt. Jetzt bekommst du personalisierte Empfehlungen!
                  </motion.p>
                </div>
                <motion.button
                  onClick={() => setShowAchievement(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
                </motion.button>
              </div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="h-1 rounded-full bg-gradient-to-r from-emerald-400 to-finsim-primary"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}



