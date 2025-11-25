"use client"

import { useMemo } from "react"
import { AnalysisResponse } from "@/lib/api"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface HealthScoreBarProps {
  analysis: AnalysisResponse
}

export function HealthScoreBar({ analysis }: HealthScoreBarProps) {
  const healthScore = useMemo(() => {
    const balance = analysis.finance_data.net_balance
    const totalIncome = analysis.finance_data.total_income
    const totalExpenses = analysis.finance_data.total_expenses
    
    // Calculate savings rate
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0
    
    // Base score starts at 50
    let score = 50
    
    // Positive balance adds up to 30 points
    if (balance > 0) {
      score += Math.min(30, (balance / totalIncome) * 30)
    } else {
      // Negative balance subtracts up to 40 points
      score -= Math.min(40, (Math.abs(balance) / totalIncome) * 40)
    }
    
    // Savings rate bonus (up to 20 points)
    if (savingsRate > 0) {
      score += Math.min(20, savingsRate * 0.2)
    }
    
    // Penalty for high expense ratio
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) : 1
    if (expenseRatio > 0.9) {
      score -= Math.min(15, (expenseRatio - 0.9) * 150)
    }
    
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)))
  }, [analysis.finance_data])

  const getHealthStatus = () => {
    if (healthScore >= 75) {
      return {
        label: "Sehr gut",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500",
        bgLight: "bg-emerald-500/20 dark:bg-emerald-500/20",
        icon: TrendingUp
      }
    }
    if (healthScore >= 50) {
      return {
        label: "Gut",
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500",
        bgLight: "bg-blue-500/20 dark:bg-blue-500/20",
        icon: Minus
      }
    }
    if (healthScore >= 25) {
      return {
        label: "Verbesserung nötig",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500",
        bgLight: "bg-amber-500/20 dark:bg-amber-500/20",
        icon: TrendingDown
      }
    }
    return {
      label: "Kritisch",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500",
      bgLight: "bg-red-500/20 dark:bg-red-500/20",
      icon: TrendingDown
    }
  }

  const status = getHealthStatus()
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-xl bg-gradient-to-br from-white/80 dark:from-finsim-dark-surfaceElevated/80 via-white/70 dark:via-finsim-dark-surfaceElevated/70 to-white/60 dark:to-finsim-dark-surfaceElevated/60 backdrop-blur-xl border border-white/20 dark:border-white/10 p-5 shadow-lg dark:shadow-2xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${status.bgLight}`}>
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wide">
              Finanzgesundheit
            </p>
            <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
              {status.label}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${status.color}`}>
            {healthScore}
          </p>
          <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
            / 100
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="relative h-3 bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${healthScore}%` }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className={`h-full ${status.bg} rounded-full shadow-sm`}
          style={{
            boxShadow: `0 0 10px ${status.bg}40`
          }}
        />
      </div>
    </motion.div>
  )
}




