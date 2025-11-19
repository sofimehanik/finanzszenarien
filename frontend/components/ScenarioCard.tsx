"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Sparkles, AlertCircle, Lightbulb } from "lucide-react"
import { Scenario } from "@/lib/api"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface ScenarioCardProps {
  scenario: Scenario
  type: "best_case" | "worst_case" | "realistic_case"
}

export function ScenarioCard({ scenario, type }: ScenarioCardProps) {
  const [expandedKIAnalysis, setExpandedKIAnalysis] = useState(false)

  const getConfig = () => {
    switch (type) {
      case "best_case":
        return {
          icon: TrendingUp,
          iconColor: "text-emerald-500 dark:text-emerald-400",
          bgColor: "bg-emerald-500/8 dark:bg-emerald-500/12",
          borderColor: "border-emerald-500/20 dark:border-emerald-400/25",
          valueColor: "text-emerald-600 dark:text-emerald-400",
          accentColor: "from-emerald-500/15 to-emerald-500/5",
          label: "Optimistisch"
        }
      case "worst_case":
        return {
          icon: TrendingDown,
          iconColor: "text-red-500 dark:text-red-400",
          bgColor: "bg-red-500/8 dark:bg-red-500/12",
          borderColor: "border-red-500/20 dark:border-red-400/25",
          valueColor: "text-red-600 dark:text-red-400",
          accentColor: "from-red-500/15 to-red-500/5",
          label: "Konservativ"
        }
      default:
        return {
          icon: Minus,
          iconColor: "text-blue-500 dark:text-blue-400",
          bgColor: "bg-blue-500/8 dark:bg-blue-500/12",
          borderColor: "border-blue-500/20 dark:border-blue-400/25",
          valueColor: "text-blue-600 dark:text-blue-400",
          accentColor: "from-blue-500/15 to-blue-500/5",
          label: "Realistisch"
        }
    }
  }

  const config = getConfig()
  const Icon = config.icon

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "group relative h-full rounded-2xl glass-effect premium-shadow overflow-hidden",
        "hover:shadow-xl dark:hover:shadow-xl transition-all duration-300",
        "border border-finsim-borderLight dark:border-finsim-dark-borderLight"
      )}
    >
      {/* Subtle accent gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
        config.accentColor
      )} />

      <div className="relative p-6 flex flex-col h-full z-10">
        {/* Header Section */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl",
                config.bgColor,
                config.borderColor,
                "border"
              )}>
                <Icon className={cn("h-4 w-4", config.iconColor)} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-finsim-textMain dark:text-white tracking-tight">
                  {scenario.title}
                </h3>
                <p className="text-[10px] uppercase tracking-wider text-finsim-textMuted dark:text-finsim-dark-textMuted mt-0.5">
                  {config.label}
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
            {scenario.description}
          </p>
        </div>

        {/* Financial Metrics - Prominent Display */}
        <div className="space-y-4 mb-6 pb-6 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium">
                Monatlich
              </p>
              <p className={cn(
                "text-2xl font-bold font-mono tracking-tight",
                config.valueColor
              )}>
                {scenario.monthly_savings >= 0 ? "+" : ""}
                {scenario.monthly_savings.toFixed(2)} €
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium">
                12 Monate
              </p>
              <p className={cn(
                "text-2xl font-bold font-mono tracking-tight",
                config.valueColor
              )}>
                {scenario.final_balance >= 0 ? "+" : ""}
                {scenario.final_balance.toFixed(2)} €
              </p>
            </div>
          </div>
        </div>

        {/* AI Analysis Section */}
        {scenario.ai_summary && (
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setExpandedKIAnalysis(!expandedKIAnalysis)}
              className="w-full flex items-center justify-between gap-2 group py-1.5 -mx-1 px-1 rounded-lg hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0" />
                <p className="text-xs font-semibold text-finsim-textMain dark:text-white uppercase tracking-wider">
                  KI-Analyse
                </p>
              </div>
              {expandedKIAnalysis ? (
                <ChevronUp className="h-3.5 w-3.5 text-finsim-textMuted dark:text-finsim-dark-textMuted group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary transition-colors flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-finsim-textMuted dark:text-finsim-dark-textMuted group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary transition-colors flex-shrink-0" />
              )}
            </button>
            {expandedKIAnalysis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                  {scenario.ai_summary}
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Risk Factors & Opportunities - Clean List */}
        <div className="space-y-4 flex-1">
          {scenario.risk_factors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider">
                  Risikofaktoren
                </p>
              </div>
              <ul className="space-y-2">
                {scenario.risk_factors.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-red-500 dark:text-red-400 mt-1 text-xs flex-shrink-0">▸</span>
                    <span className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed flex-1">
                      {risk}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {scenario.opportunities.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Chancen
                </p>
              </div>
              <ul className="space-y-2">
                {scenario.opportunities.map((opp, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-emerald-600 dark:text-emerald-400 mt-1 text-xs flex-shrink-0">▸</span>
                    <span className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed flex-1">
                      {opp}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
