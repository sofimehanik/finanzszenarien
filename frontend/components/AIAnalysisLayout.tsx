"use client"

import { useState, useEffect } from "react"
import { Sparkles, AlertTriangle, Target, Lightbulb, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface AIAnalysisLayoutProps {
  plausibilityText?: string
  tipsText?: string
  isPlausibilityFromLLM?: boolean
  isTipsFromLLM?: boolean
  formatLLMText: (text: string) => Array<{ type: string; content: string; number?: string }>
}

export function AIAnalysisLayout({
  plausibilityText,
  tipsText,
  isPlausibilityFromLLM = false,
  isTipsFromLLM = false,
  formatLLMText,
}: AIAnalysisLayoutProps) {
  const [displayedPlausibility, setDisplayedPlausibility] = useState<string>("")
  const [displayedTips, setDisplayedTips] = useState<string>("")
  const [isTypingPlausibility, setIsTypingPlausibility] = useState(false)
  const [isTypingTips, setIsTypingTips] = useState(false)

  // Typing animation for plausibility
  useEffect(() => {
    if (!plausibilityText || !isPlausibilityFromLLM) {
      setDisplayedPlausibility(plausibilityText || "")
      return
    }

    setIsTypingPlausibility(true)
    setDisplayedPlausibility("")
    let index = 0

    const typeInterval = setInterval(() => {
      if (index < plausibilityText.length) {
        setDisplayedPlausibility(plausibilityText.slice(0, index + 1))
        index++
      } else {
        setIsTypingPlausibility(false)
        clearInterval(typeInterval)
      }
    }, 10) // Adjust speed here

    return () => clearInterval(typeInterval)
  }, [plausibilityText, isPlausibilityFromLLM])

  // Typing animation for tips
  useEffect(() => {
    if (!tipsText || !isTipsFromLLM) {
      setDisplayedTips(tipsText || "")
      return
    }

    setIsTypingTips(true)
    setDisplayedTips("")
    let index = 0

    const typeInterval = setInterval(() => {
      if (index < tipsText.length) {
        setDisplayedTips(tipsText.slice(0, index + 1))
        index++
      } else {
        setIsTypingTips(false)
        clearInterval(typeInterval)
      }
    }, 10)

    return () => clearInterval(typeInterval)
  }, [tipsText, isTipsFromLLM])

  // Extract risks and opportunities from text
  const extractRisksAndOpportunities = (text: string) => {
    const risks: string[] = []
    const opportunities: string[] = []
    
    const formatted = formatLLMText(text)
    let currentSection = ""
    
    formatted.forEach(item => {
      const content = item.content.toLowerCase()
      
      if (content.includes("risiko") || content.includes("risikofaktor") || content.includes("gefahr")) {
        currentSection = "risks"
      } else if (content.includes("chance") || content.includes("opportunität") || content.includes("möglichkeit")) {
        currentSection = "opportunities"
      } else if (currentSection === "risks" && (item.type === "bullet" || item.type === "numbered")) {
        risks.push(item.content)
      } else if (currentSection === "opportunities" && (item.type === "bullet" || item.type === "numbered")) {
        opportunities.push(item.content)
      }
    })
    
    return { risks, opportunities }
  }

  const plausibilityRisks = plausibilityText ? extractRisksAndOpportunities(plausibilityText).risks : []
  const plausibilityOpportunities = plausibilityText ? extractRisksAndOpportunities(plausibilityText).opportunities : []

  const CardWrapper = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      {children}
    </motion.div>
  )

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
            Vertiefte Analyse & KI-Empfehlungen
          </h3>
          <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
            {isPlausibilityFromLLM || isTipsFromLLM
              ? "Individuelle Auswertung deiner Daten durch KI"
              : "Individuelle Auswertung deiner Daten"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Plausibility Analysis Card */}
        {plausibilityText && (
          <CardWrapper delay={0.1}>
            <div className="h-full rounded-xl bg-gradient-to-br from-white/80 dark:from-finsim-dark-surfaceElevated/80 via-white/70 dark:via-finsim-dark-surfaceElevated/70 to-white/60 dark:to-finsim-dark-surfaceElevated/60 backdrop-blur-xl border border-white/20 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-lg dark:shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-finsim-primary/10 dark:bg-finsim-dark-primary/20">
                  <Sparkles className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wide truncate">
                    Plausibilitätsanalyse
                  </p>
                  <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted line-clamp-2">
                    Bewertung, wie realistisch die Szenarien sind.
                  </p>
                </div>
              </div>
              <div className="min-h-[200px] max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div className={`prose prose-sm max-w-none ${
                  isPlausibilityFromLLM ? 'text-finsim-textMain dark:text-finsim-dark-textMain' : 'text-finsim-textSecondary dark:text-finsim-dark-textSecondary'
                }`}>
                  {formatLLMText(displayedPlausibility || plausibilityText).map((item, idx) => {
                    if (item.type === 'heading') {
                      return (
                        <h4 key={idx} className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain mt-4 mb-2 first:mt-0 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight pb-1">
                          {item.content}
                        </h4>
                      )
                    }
                    if (item.type === 'numbered') {
                      return (
                        <div key={idx} className="flex gap-3 mb-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-finsim-primary/20 dark:from-finsim-dark-primary/20 to-finsim-primary/10 dark:to-finsim-dark-primary/10 text-finsim-primary dark:text-finsim-dark-primary text-xs font-bold flex items-center justify-center border border-finsim-primary/30 dark:border-finsim-dark-primary/30">
                            {item.number}
                          </span>
                          <p className="text-xs leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                            {item.content}
                          </p>
                        </div>
                      )
                    }
                    if (item.type === 'bullet') {
                      return (
                        <div key={idx} className="flex gap-2 mb-2 pl-1">
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary mt-2" />
                          <p className="text-xs leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                            {item.content}
                          </p>
                        </div>
                      )
                    }
                    return (
                      <p key={idx} className="mb-3 last:mb-0 text-xs leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain">
                        {item.content}
                        {isTypingPlausibility && idx === formatLLMText(displayedPlausibility || plausibilityText).length - 1 && (
                          <span className="inline-block w-1 h-3 bg-finsim-primary dark:bg-finsim-dark-primary ml-1 animate-pulse" />
                        )}
                      </p>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardWrapper>
        )}

        {/* Risks Card */}
        {plausibilityRisks.length > 0 && (
          <CardWrapper delay={0.2}>
            <div className="h-full rounded-xl bg-gradient-to-br from-red-50/50 dark:from-red-950/20 via-red-50/30 dark:via-red-950/10 to-transparent dark:to-transparent backdrop-blur-xl border border-red-200/50 dark:border-red-900/30 p-5 sm:p-6 space-y-4 shadow-lg dark:shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/10 dark:bg-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide truncate">
                    Risikofaktoren
                  </p>
                  <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
                    Potenzielle Gefahren
                  </p>
                </div>
              </div>
              <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {plausibilityRisks.slice(0, 8).map((risk, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-red-500 dark:text-red-400 mt-1 text-[10px] flex-shrink-0">▸</span>
                    <span className="text-xs leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                      {risk}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </CardWrapper>
        )}

        {/* Opportunities Card */}
        {plausibilityOpportunities.length > 0 && (
          <CardWrapper delay={0.3}>
            <div className="h-full rounded-xl bg-gradient-to-br from-emerald-50/50 dark:from-emerald-950/20 via-emerald-50/30 dark:via-emerald-950/10 to-transparent dark:to-transparent backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-900/30 p-5 sm:p-6 space-y-4 shadow-lg dark:shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20">
                  <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide truncate">
                    Chancen
                  </p>
                  <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
                    Potenzielle Möglichkeiten
                  </p>
                </div>
              </div>
              <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {plausibilityOpportunities.slice(0, 8).map((opp, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-emerald-600 dark:text-emerald-400 mt-1 text-[10px] flex-shrink-0">▸</span>
                    <span className="text-xs leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                      {opp}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </CardWrapper>
        )}

        {/* Tips Card - Full Width on Large Screens */}
        {tipsText && (
          <CardWrapper delay={0.4}>
            <div className={`h-full rounded-xl bg-gradient-to-br from-blue-50/50 dark:from-blue-950/20 via-blue-50/30 dark:via-blue-950/10 to-transparent dark:to-transparent backdrop-blur-xl border border-blue-200/50 dark:border-blue-900/30 p-5 sm:p-6 space-y-4 shadow-lg dark:shadow-2xl ${
              plausibilityRisks.length === 0 && plausibilityOpportunities.length === 0 
                ? "md:col-span-2" 
                : "md:col-span-2 lg:col-span-3"
            }`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-finsim-primary/10 dark:bg-finsim-dark-primary/20">
                  <Lightbulb className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wide truncate">
                    Personalisierte Tipps
                  </p>
                  <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
                    Konkrete Handlungsempfehlungen
                  </p>
                </div>
              </div>
              <div className="min-h-[200px] max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <div className={`prose prose-sm max-w-none ${
                  isTipsFromLLM ? 'text-finsim-textMain dark:text-finsim-dark-textMain' : 'text-finsim-textSecondary dark:text-finsim-dark-textSecondary'
                }`}>
                  {formatLLMText(displayedTips || tipsText).map((item, idx) => {
                    if (item.type === 'heading') {
                      return (
                        <h4 key={idx} className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain mt-4 mb-2 first:mt-0 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight pb-1">
                          {item.content}
                        </h4>
                      )
                    }
                    if (item.type === 'numbered') {
                      return (
                        <div key={idx} className="flex gap-3 mb-4 group hover:bg-finsim-surfaceElevated/50 dark:hover:bg-finsim-dark-surfaceElevated/50 rounded-lg p-2 -ml-2 transition-colors">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-finsim-primary/25 dark:from-finsim-dark-primary/25 to-finsim-primary/15 dark:to-finsim-dark-primary/15 text-finsim-primary dark:text-finsim-dark-primary text-xs font-bold flex items-center justify-center border-2 border-finsim-primary/30 dark:border-finsim-dark-primary/30 shadow-sm group-hover:shadow-md transition-all">
                            {item.number}
                          </span>
                          <p className="text-xs leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1 pt-0.5">
                            {item.content}
                          </p>
                        </div>
                      )
                    }
                    if (item.type === 'bullet') {
                      return (
                        <div key={idx} className="flex gap-2 mb-2 pl-1">
                          <CheckCircle2 className="flex-shrink-0 w-3.5 h-3.5 text-finsim-primary dark:text-finsim-dark-primary mt-1.5" />
                          <p className="text-xs leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                            {item.content}
                          </p>
                        </div>
                      )
                    }
                    return (
                      <p key={idx} className="mb-3 last:mb-0 text-xs leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain">
                        {item.content}
                        {isTypingTips && idx === formatLLMText(displayedTips || tipsText).length - 1 && (
                          <span className="inline-block w-1 h-3 bg-finsim-primary dark:bg-finsim-dark-primary ml-1 animate-pulse" />
                        )}
                      </p>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardWrapper>
        )}
      </div>
    </section>
  )
}





