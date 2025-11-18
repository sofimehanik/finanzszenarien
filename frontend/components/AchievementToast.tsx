"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, TrendingUp, Target, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

interface Achievement {
  id: string
  icon: React.ReactNode
  title: string
  message: string
  color: string
}

interface AchievementToastProps {
  achievements: Achievement[]
  onComplete: (id: string) => void
}

export function AchievementToast({ achievements, onComplete }: AchievementToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {achievements.map((achievement) => (
          <AchievementItem
            key={achievement.id}
            achievement={achievement}
            onComplete={() => onComplete(achievement.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function AchievementItem({ achievement, onComplete }: { achievement: Achievement, onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onComplete, 300)
    }, 4000)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 100, scale: isVisible ? 1 : 0.9 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="pointer-events-auto rounded-xl bg-gradient-to-br from-white/95 dark:from-finsim-dark-surfaceElevated/95 via-white/90 dark:via-finsim-dark-surfaceElevated/90 to-white/85 dark:to-finsim-dark-surfaceElevated/85 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl p-4 min-w-[280px] max-w-[320px]"
      style={{
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)"
      }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="p-2 rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${achievement.color}15` }}
        >
          <div style={{ color: achievement.color }}>
            {achievement.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-finsim-textMain dark:text-finsim-dark-textMain mb-0.5">
            {achievement.title}
          </p>
          <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
            {achievement.message}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// Helper function to create achievements
export function createAchievement(
  type: "first_analysis" | "savings_milestone" | "positive_balance" | "goal_reached",
  data?: any
): Achievement | null {
  switch (type) {
    case "first_analysis":
      return {
        id: "first_analysis",
        icon: <Sparkles className="h-5 w-5" />,
        title: "Erste Analyse",
        message: "Du hast deine erste Analyse gespeichert!",
        color: "#3b82f6"
      }
    case "savings_milestone":
      return {
        id: `savings_${data?.amount}`,
        icon: <TrendingUp className="h-5 w-5" />,
        title: "Ersparnis-Meilenstein",
        message: `Erste ${data?.amount}€ gespart! Weiter so!`,
        color: "#10b981"
      }
    case "positive_balance":
      return {
        id: "positive_balance",
        icon: <CheckCircle2 className="h-5 w-5" />,
        title: "Positives Guthaben",
        message: "Dein Guthaben ist jetzt positiv! 🎉",
        color: "#10b981"
      }
    case "goal_reached":
      return {
        id: "goal_reached",
        icon: <Target className="h-5 w-5" />,
        title: "Ziel erreicht",
        message: data?.message || "Du hast dein finanzielles Ziel erreicht!",
        color: "#8b5cf6"
      }
    default:
      return null
  }
}

