"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Minus, Sparkles, AlertCircle, Lightbulb, ChevronRight, ChevronDown } from "lucide-react"
import { AnalysisResponse } from "@/lib/api"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface ScenarioOverviewProps {
  analysis: AnalysisResponse
}

export function ScenarioOverview({ analysis }: ScenarioOverviewProps) {
  const [selectedScenario, setSelectedScenario] = useState<"best_case" | "realistic_case" | "worst_case">("realistic_case")
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  // Always expand when scenario changes or component mounts
  useEffect(() => {
    setIsExpanded(true)
  }, [selectedScenario, analysis])

  // Check after all hooks (React rules)
  if (!analysis || !analysis.scenarios) {
    return null
  }

  const scenarios = {
    best_case: analysis.scenarios.best_case,
    realistic_case: analysis.scenarios.realistic_case,
    worst_case: analysis.scenarios.worst_case
  }

  const getScenarioConfig = (type: string) => {
    switch (type) {
      case "best_case":
        return {
          icon: TrendingUp,
          label: "Optimistisch",
          bgGradient: "from-emerald-500/10 to-emerald-500/5",
          borderColor: "border-emerald-500/20",
          textColor: "text-emerald-600 dark:text-emerald-400",
          bgIcon: "bg-emerald-500/15",
          bgBar: "bg-emerald-500/30",
          bgBarActive: "bg-emerald-500",
          hoverBg: "hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10",
          borderSection: "border-emerald-500/20 dark:border-emerald-500/30"
        }
      case "worst_case":
        return {
          icon: TrendingDown,
          label: "Konservativ",
          bgGradient: "from-red-500/10 to-red-500/5",
          borderColor: "border-red-500/20",
          textColor: "text-red-600 dark:text-red-400",
          bgIcon: "bg-red-500/15",
          bgBar: "bg-red-500/30",
          bgBarActive: "bg-red-500",
          hoverBg: "hover:bg-red-500/5 dark:hover:bg-red-500/10",
          borderSection: "border-red-500/20 dark:border-red-500/30"
        }
      default:
        return {
          icon: Minus,
          label: "Realistisch",
          bgGradient: "from-blue-500/10 to-blue-500/5",
          borderColor: "border-blue-500/20",
          textColor: "text-blue-600 dark:text-blue-400",
          bgIcon: "bg-blue-500/15",
          bgBar: "bg-blue-500/30",
          bgBarActive: "bg-blue-500",
          hoverBg: "hover:bg-blue-500/5 dark:hover:bg-blue-500/10",
          borderSection: "border-blue-500/20 dark:border-blue-500/30"
        }
    }
  }

  const currentScenario = scenarios[selectedScenario]
  const config = getScenarioConfig(selectedScenario)
  const Icon = config.icon

  return (
    <div className="space-y-6">
      {/* Scenario Selector Cards */}
      <div className="grid md:grid-cols-3 gap-3">
        {Object.entries(scenarios).map(([key, scenario], idx) => {
          const scConfig = getScenarioConfig(key)
          const ScIcon = scConfig.icon
          const isSelected = selectedScenario === key
          
          return (
            <motion.button
              key={key}
              onClick={() => {
                if (isSelected) {
                  // If already selected, toggle expand/collapse
                  setIsExpanded(!isExpanded)
                } else {
                  // If not selected, select and expand
                  setSelectedScenario(key as any)
                  setIsExpanded(true)
                }
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3, ease: "easeOut" }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative p-4 rounded-xl glass-effect border transition-all duration-200 text-left group cursor-pointer",
                isSelected 
                  ? `${scConfig.borderColor} border-2 bg-gradient-to-br ${scConfig.bgGradient}` 
                  : "border-finsim-borderLight/50 dark:border-finsim-dark-borderLight/50 hover:border-finsim-primary/30"
              )}
            >
              {isSelected && (
                <>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.2 }}
                    className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-xl", scConfig.bgBarActive)}
                  />
                  {/* Collapse indicator */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute top-3 right-3"
                  >
                    <ChevronDown className={cn("h-4 w-4", scConfig.textColor)} />
                  </motion.div>
                </>
              )}

              <div className="flex items-center gap-2.5 mb-3">
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  isSelected ? scConfig.bgIcon : "bg-finsim-surfaceElevated/50 dark:bg-finsim-dark-surfaceElevated/50"
                )}>
                  <ScIcon className={cn(
                    "h-4 w-4",
                    isSelected ? scConfig.textColor : "text-finsim-textSecondary dark:text-finsim-dark-textSecondary"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-semibold truncate mb-0.5",
                    isSelected ? scConfig.textColor : "text-finsim-textMain dark:text-white"
                  )}>
                    {scenario.title}
                  </p>
                  <p className={cn(
                    "text-[10px] uppercase tracking-wider font-medium",
                    isSelected ? scConfig.textColor : "text-finsim-textMuted dark:text-finsim-dark-textMuted"
                  )}>
                    {scConfig.label}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-finsim-borderLight/30 dark:border-finsim-dark-borderLight/30">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-finsim-textMuted dark:text-finsim-dark-textMuted mb-1">
                    Monatlich
                  </p>
                  <p className={cn(
                    "text-base font-bold font-mono",
                    isSelected ? scConfig.textColor : "text-finsim-textMain dark:text-white"
                  )}>
                    {scenario.monthly_savings >= 0 ? "+" : ""}
                    {scenario.monthly_savings.toFixed(2)} €
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-finsim-textMuted dark:text-finsim-dark-textMuted mb-1">
                    12 Monate
                  </p>
                  <p className={cn(
                    "text-base font-bold font-mono",
                    isSelected ? scConfig.textColor : "text-finsim-textMain dark:text-white"
                  )}>
                    {scenario.final_balance >= 0 ? "+" : ""}
                    {scenario.final_balance.toFixed(2)} €
                  </p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Selected Scenario Details - Collapsible */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            key={selectedScenario}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ 
              duration: 0.3, 
              ease: [0.4, 0, 0.2, 1]
            }}
            className={cn(
              "rounded-2xl glass-effect premium-shadow border-2 relative overflow-hidden",
              config.borderColor,
              "bg-gradient-to-br from-white/80 to-white/60 dark:from-finsim-dark-surfaceElevated dark:to-finsim-dark-surfaceMuted"
            )}
          >
            <div className="p-5 space-y-4">
              {/* Color accent bar */}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                style={{ transformOrigin: "top" }}
                className={cn("absolute left-0 top-0 bottom-0 w-1", config.bgBarActive)}
              />
              
              {/* Description */}
              <div>
                <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                  {currentScenario.description}
                </p>
              </div>

              {/* Risk Factors */}
              {currentScenario.risk_factors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className={cn(
                    "border rounded-lg p-3 bg-gradient-to-br",
                    config.borderSection
                  )}
                >
              <div className="flex items-center gap-2 mb-2.5">
                <AlertCircle className="h-3 w-3 text-red-500 dark:text-red-400 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-red-500 dark:text-red-400">
                  Risikofaktoren ({currentScenario.risk_factors.length})
                </p>
              </div>
              <div className="space-y-1.5">
                {currentScenario.risk_factors.map((risk, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-md bg-white/30 dark:bg-white/3"
                  >
                    <span className="text-red-500 dark:text-red-400 mt-0.5 text-[10px] flex-shrink-0">•</span>
                    <p className="text-[11px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-snug flex-1">
                      {risk}
                    </p>
                  </div>
                ))}
                  </div>
                </motion.div>
              )}

              {/* Opportunities */}
              {currentScenario.opportunities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className={cn(
                    "border rounded-lg p-3 bg-gradient-to-br",
                    config.borderSection
                  )}
                >
              <div className="flex items-center gap-2 mb-2.5">
                <Lightbulb className="h-3 w-3 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Chancen ({currentScenario.opportunities.length})
                </p>
              </div>
              <div className="space-y-1.5">
                {currentScenario.opportunities.map((opp, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-md bg-white/30 dark:bg-white/3"
                  >
                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 text-[10px] flex-shrink-0">•</span>
                    <p className="text-[11px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-snug flex-1">
                      {opp}
                    </p>
                  </div>
                ))}
                  </div>
                </motion.div>
              )}

              {/* AI Analysis */}
              {currentScenario.ai_summary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className={cn(
                    "border rounded-lg overflow-hidden",
                    config.borderColor
                  )}
                >
              <button
                onClick={() => setExpandedDetails(expandedDetails === "ai" ? null : "ai")}
                className={cn(
                  "w-full p-3 flex items-center justify-between gap-2.5 transition-colors",
                  "hover:bg-white/40 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn("p-1.5 rounded-lg", config.bgIcon)}>
                    <Sparkles className={cn("h-3.5 w-3.5", config.textColor)} />
                  </div>
                  <p className={cn("text-xs font-semibold", config.textColor)}>
                    KI-Analyse
                  </p>
                </div>
                <ChevronRight 
                  className={cn(
                    "h-3.5 w-3.5 text-finsim-textMuted dark:text-finsim-dark-textMuted transition-transform flex-shrink-0",
                    expandedDetails === "ai" && "rotate-90"
                  )}
                />
              </button>
              <AnimatePresence>
                {expandedDetails === "ai" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ 
                        duration: 0.3, 
                        ease: [0.4, 0, 0.2, 1],
                        height: { duration: 0.3 },
                        opacity: { duration: 0.2 }
                      }}
                      className="overflow-hidden"
                    >
                    <div className="px-3 pb-3 pt-0">
                      <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                        {currentScenario.ai_summary}
                      </p>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
