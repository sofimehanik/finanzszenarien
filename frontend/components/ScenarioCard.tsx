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
  const getIcon = () => {
    switch (type) {
      case "best_case":
        return (
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
        )
      case "worst_case":
        return (
          <div className="p-2 rounded-lg bg-gradient-to-br from-red-400 to-red-600 shadow-sm">
            <TrendingDown className="h-4 w-4 text-white" />
          </div>
        )
      default:
        return (
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm">
            <Minus className="h-4 w-4 text-white" />
          </div>
        )
    }
  }

  const getAccentColor = () => {
    switch (type) {
      case "best_case":
        return "from-emerald-500/10 via-emerald-500/5 to-transparent border-l-emerald-500"
      case "worst_case":
        return "from-red-500/10 via-red-500/5 to-transparent border-l-red-500"
      default:
        return "from-blue-500/10 via-blue-500/5 to-transparent border-l-blue-500"
    }
  }

  const getValueColor = () => {
    switch (type) {
      case "best_case":
        return "text-emerald-600"
      case "worst_case":
        return "text-red-500"
      default:
        return "text-blue-600"
    }
  }

  return (
    <div 
      className={cn(
        "group relative h-full rounded-xl border border-finsim-border dark:border-finsim-dark-border bg-finsim-surface dark:bg-finsim-dark-surface overflow-hidden",
        "hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-black/20 hover:-translate-y-1 transition-all duration-300",
        "border-l-4",
        "min-h-[360px] md:min-h-[420px]",
        type === "best_case" && "border-l-emerald-500 dark:border-l-emerald-400",
        type === "worst_case" && "border-l-red-500 dark:border-l-red-400",
        type === "realistic_case" && "border-l-blue-500 dark:border-l-blue-400"
      )}
    >
      {/* Gradient accent */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
        getAccentColor()
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
            <p className={cn("text-sm font-bold font-mono tracking-tight", getValueColor(), "dark:text-opacity-90")}>
              {scenario.monthly_savings >= 0 ? "+" : ""}
              {scenario.monthly_savings.toFixed(2)} €
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wider">12 Monate</p>
            <p className={cn("text-sm font-bold font-mono tracking-tight", getValueColor(), "dark:text-opacity-90")}>
              {scenario.final_balance >= 0 ? "+" : ""}
              {scenario.final_balance.toFixed(2)} €
            </p>
          </div>
        </div>

        {/* AI Summary - Full text, no truncation */}
        {scenario.ai_summary && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0" />
              <p className="text-[9px] font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wider">KI-Analyse</p>
            </div>
            <p className="text-[11px] text-finsim-textMain dark:text-finsim-dark-textMain leading-snug">{scenario.ai_summary}</p>
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

