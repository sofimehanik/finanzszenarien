"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { Scenario } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ScenarioCardProps {
  scenario: Scenario
  type: "best_case" | "worst_case" | "realistic_case"
}

export function ScenarioCard({ scenario, type }: ScenarioCardProps) {
  const [expandedRisks, setExpandedRisks] = useState(false)
  const [expandedOpportunities, setExpandedOpportunities] = useState(false)
  const [expandedKIAnalysis, setExpandedKIAnalysis] = useState(false)
  const getIcon = () => {
    switch (type) {
      case "best_case":
        return (
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-400/30 shadow-sm group-hover:shadow-md group-hover:bg-emerald-500/15 dark:group-hover:bg-emerald-500/25 transition-all duration-300">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        )
      case "worst_case":
        return (
          <div className="p-2.5 rounded-2xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-400/30 shadow-sm group-hover:shadow-md group-hover:bg-red-500/15 dark:group-hover:bg-red-500/25 transition-all duration-300">
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
        )
      default:
        return (
          <div className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-400/30 shadow-sm group-hover:shadow-md group-hover:bg-blue-500/15 dark:group-hover:bg-blue-500/25 transition-all duration-300">
            <Minus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        )
    }
  }

  const getValueColor = () => {
    switch (type) {
      case "best_case":
        return "text-emerald-600 dark:text-emerald-400"
      case "worst_case":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-blue-600 dark:text-blue-400"
    }
  }

  return (
    <div 
      className={cn(
        "group relative h-full rounded-[24px] glass-effect premium-shadow overflow-hidden",
        "hover:shadow-2xl dark:hover:shadow-2xl hover:-translate-y-1 transition-all duration-300",
        "min-h-[360px] md:min-h-[420px]",
        // Color-specific hover effects
        type === "best_case" && "hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/20",
        type === "worst_case" && "hover:shadow-red-500/10 dark:hover:shadow-red-400/20",
        type === "realistic_case" && "hover:shadow-blue-500/10 dark:hover:shadow-blue-400/20"
      )}
    >
      {/* Modern accent line - тонкая цветная линия сверху */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 transition-all duration-300",
        type === "best_case" && "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600",
        type === "worst_case" && "bg-gradient-to-r from-red-400 via-red-500 to-red-600",
        type === "realistic_case" && "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"
      )} />
      
      {/* Subtle color glow on hover - ненавязчивая подсветка */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[24px]",
        type === "best_case" && "bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent",
        type === "worst_case" && "bg-gradient-to-br from-red-500/5 via-transparent to-transparent",
        type === "realistic_case" && "bg-gradient-to-br from-blue-500/5 via-transparent to-transparent"
      )} />
      
      <div className="relative p-6 md:p-7 space-y-3">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            {getIcon()}
            <h3 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">{scenario.title}</h3>
          </div>
          <p className="text-[11px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-snug line-clamp-2">{scenario.description}</p>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-2 gap-2.5 pb-2.5 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
          <div className="space-y-0.5">
            <p className="text-[9px] font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wider">Monatlich</p>
            <p className={cn("text-base font-bold font-mono tracking-tight", getValueColor())}>
              {scenario.monthly_savings >= 0 ? "+" : ""}
              {scenario.monthly_savings.toFixed(2)} €
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wider">12 Monate</p>
            <p className={cn("text-base font-bold font-mono tracking-tight", getValueColor())}>
              {scenario.final_balance >= 0 ? "+" : ""}
              {scenario.final_balance.toFixed(2)} €
            </p>
          </div>
        </div>

        {/* AI Summary - Collapsible */}
        {scenario.ai_summary && (
          <div className="space-y-1">
            <button
              onClick={() => setExpandedKIAnalysis(!expandedKIAnalysis)}
              className="w-full flex items-center justify-between gap-2 group hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0" />
                <p className="text-[9px] font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wider">KI-Analyse</p>
              </div>
              {expandedKIAnalysis ? (
                <ChevronUp className="h-3 w-3 text-finsim-textSecondary dark:text-finsim-dark-textSecondary group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary transition-colors flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 text-finsim-textSecondary dark:text-finsim-dark-textSecondary group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary transition-colors flex-shrink-0" />
              )}
            </button>
            {expandedKIAnalysis && (
              <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300 pt-1">
                <p className="text-[11px] text-finsim-textMain dark:text-finsim-dark-textMain leading-snug">{scenario.ai_summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Risk Factors - Compact */}
        {scenario.risk_factors.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] font-semibold text-red-500 uppercase tracking-wider">Risikofaktoren</p>
            <ul className="text-[11px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary space-y-0.5 leading-snug">
              {(expandedRisks ? scenario.risk_factors : scenario.risk_factors.slice(0, 4)).map((risk, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-red-500 dark:text-red-400 mt-0.5 text-[9px] flex-shrink-0">▸</span>
                  <span className="line-clamp-2 flex-1">{risk}</span>
                </li>
              ))}
              {scenario.risk_factors.length > 4 && (
                <li className="mt-1 pt-1 border-t border-finsim-borderLight dark:border-finsim-dark-borderLight">
                  <button
                    onClick={() => setExpandedRisks(!expandedRisks)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-red-500 hover:text-red-600 transition-colors w-full text-left"
                  >
                    {expandedRisks ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        <span>Weniger anzeigen</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        <span>+{scenario.risk_factors.length - 4} weitere anzeigen</span>
                      </>
                    )}
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Opportunities - Compact */}
        {scenario.opportunities.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider">Chancen</p>
            <ul className="text-[11px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary space-y-0.5 leading-snug">
              {(expandedOpportunities ? scenario.opportunities : scenario.opportunities.slice(0, 4)).map((opp, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 text-[9px] flex-shrink-0">▸</span>
                  <span className="line-clamp-2 flex-1">{opp}</span>
                </li>
              ))}
              {scenario.opportunities.length > 4 && (
                <li className="mt-1 pt-1 border-t border-finsim-borderLight dark:border-finsim-dark-borderLight">
                  <button
                    onClick={() => setExpandedOpportunities(!expandedOpportunities)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors w-full text-left"
                  >
                    {expandedOpportunities ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        <span>Weniger anzeigen</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        <span>+{scenario.opportunities.length - 4} weitere anzeigen</span>
                      </>
                    )}
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

