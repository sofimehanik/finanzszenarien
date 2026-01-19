"use client"

import { useState, useEffect, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush } from "recharts"
import { ScenarioProjection } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { Maximize2, X, Trophy, Target, AlertTriangle, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Wallet, PiggyBank, DollarSign, Percent, BarChart3, ZoomIn, ZoomOut, RotateCcw, Sparkles, Brain } from "lucide-react"

interface ScenarioChartProps {
  bestCase: ScenarioProjection[]
  realisticCase: ScenarioProjection[]
  worstCase: ScenarioProjection[]
  monthsAhead?: number
  onMonthsAheadChange?: (months: number) => void
  aiAnalysis?: {
    plausibility?: string | null
    tips?: string | null
    scenario_analysis?: string | null
    summary?: string | null
  }
  financeData?: {
    net_balance: number
    monthly_averages: {
      income: number
      expenses: number
    }
  }
}

type ScenarioType = "best" | "realistic" | "worst"

export function ScenarioChart({ 
  bestCase, 
  realisticCase, 
  worstCase,
  monthsAhead = 12,
  onMonthsAheadChange,
  aiAnalysis,
  financeData
}: ScenarioChartProps) {
  const [activeLine, setActiveLine] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeScenario, setActiveScenario] = useState<ScenarioType>("best")
  const [enabledLines, setEnabledLines] = useState<Record<string, boolean>>({
    Kumuliert: true,
    Saldo: true,
    Trend: true,
    Durchschnitt: true,
    Einnahmen: true,  // Включено по умолчанию для будущих доходов
    Ausgaben: true,   // Включено по умолчанию для будущих расходов
    Kontostand: true, // Баланс по счетам
  })
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null)
  const [brushStartIndex, setBrushStartIndex] = useState<number>(0)
  const [brushEndIndex, setBrushEndIndex] = useState<number>(0)

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()
    let timeoutId: NodeJS.Timeout
    const observer = new MutationObserver(() => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkTheme, 50)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      observer.disconnect()
      clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
      
      // Handle ESC key to close fullscreen
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsFullscreen(false)
        }
      }
      document.addEventListener('keydown', handleEsc)
      
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEsc)
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isFullscreen])

  // Get current scenario projections - filter by monthsAhead
  const currentProjections = useMemo(() => {
    let projections: ScenarioProjection[] = []
    if (activeScenario === "best") projections = bestCase
    else if (activeScenario === "realistic") projections = realisticCase
    else projections = worstCase
    
    // Filter to show only the selected number of months
    if (monthsAhead && projections.length > monthsAhead) {
      return projections.slice(0, monthsAhead)
    }
    return projections
  }, [activeScenario, bestCase, realisticCase, worstCase, monthsAhead])

  const chartData = useMemo(() => {
    if (!currentProjections || currentProjections.length === 0) return []
    
    // Начальный баланс из исторических данных или из первого месяца
    const initialBalance = financeData?.net_balance ?? 0
    
    const data = currentProjections.map((p, index) => {
      // Баланс по счетам = начальный баланс + накопленный баланс
      const accountBalance = initialBalance + Number(p.cumulative_balance ?? 0)
      
      return {
        month: p.month,
        Einnahmen: Number(p.projected_income ?? 0) || 0,
        Ausgaben: Number(Math.abs(p.projected_expenses ?? 0)) || 0,
        Saldo: Number(p.projected_balance ?? 0) || 0,
        Kumuliert: Number(p.cumulative_balance ?? 0) || 0,
        Kontostand: accountBalance, // Баланс по счетам
      }
    })

    // Calculate trend line (linear regression for cumulative balance)
    if (data.length > 1) {
      const n = data.length
      const sumX = data.reduce((sum, _, i) => sum + i, 0)
      const sumY = data.reduce((sum, d) => sum + d.Kumuliert, 0)
      const sumXY = data.reduce((sum, d, i) => sum + i * d.Kumuliert, 0)
      const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0)
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n
      
      // Calculate average cumulative balance
      const avgCumulative = sumY / n
      
      // Add trend and average to each data point
      return data.map((d, i) => ({
        ...d,
        Trend: slope * i + intercept,
        Durchschnitt: avgCumulative,
      }))
    }

    return data
  }, [currentProjections])

  // Reset zoom when monthsAhead or scenario changes
  useEffect(() => {
    setZoomDomain(null)
    if (chartData.length > 0) {
      const maxIndex = Math.max(0, chartData.length - 1)
      setBrushStartIndex(0)
      setBrushEndIndex(maxIndex)
    } else {
      setBrushStartIndex(0)
      setBrushEndIndex(0)
    }
  }, [monthsAhead, activeScenario, chartData.length])

  // Calculate financial insights based on filtered projections (respecting monthsAhead)
  const financialInsights = useMemo(() => {
    if (!currentProjections || currentProjections.length === 0) {
      return {
        final: 0,
        growth: 0,
        growthPct: 0,
        avgMonthly: 0,
        savingsRate: 0,
        totalIncome: 0,
        totalExpense: 0,
        avgIncome: 0,
        avgExpense: 0,
      }
    }

    // Use filtered projections (already filtered by monthsAhead in currentProjections)
    const projections = currentProjections
    
    const initialBalance = Number(projections[0]?.cumulative_balance ?? 0)
    const finalBalance = Number(projections[projections.length - 1]?.cumulative_balance ?? 0)
    
    const growth = finalBalance - initialBalance
    const growthPct = initialBalance !== 0 ? (growth / Math.abs(initialBalance)) * 100 : 0

    const totalIncome = projections.reduce((sum, p) => sum + (Number(p.projected_income ?? 0) || 0), 0)
    const totalExpense = projections.reduce((sum, p) => sum + (Number(Math.abs(p.projected_expenses ?? 0)) || 0), 0)
    const avgMonthly = projections.reduce((sum, p) => sum + (Number(p.projected_balance ?? 0) || 0), 0) / projections.length

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
    const avgIncome = totalIncome / projections.length
    const avgExpense = totalExpense / projections.length

    return {
      final: finalBalance,
      growth,
      growthPct,
      avgMonthly,
      savingsRate,
      totalIncome,
      totalExpense,
      avgIncome,
      avgExpense,
    }
  }, [currentProjections])

  // Financial lines prioritized by importance for forecasting
  const lineConfig = useMemo(() => [
    // Primary: Most important for financial forecasting
    { 
      key: "Kumuliert", 
      color: isDark ? "#818cf8" : "#6366f1", 
      label: "Kumulierter Saldo", 
      priority: "primary",
      description: "Gesamtes Vermögen über Zeit"
    },
    { 
      key: "Saldo", 
      color: isDark ? "#60a5fa" : "#3b82f6", 
      label: "Monatssaldo", 
      priority: "primary",
      description: "Monatlicher Cashflow"
    },
    { 
      key: "Kontostand", 
      color: isDark ? "#a78bfa" : "#8b5cf6", 
      label: "Kontostand", 
      priority: "primary",
      description: "Tatsächlicher Kontostand (Startguthaben + Kumuliert)"
    },
    // Secondary: Reference lines for comparison
    { 
      key: "Trend", 
      color: isDark ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.4)", 
      label: "Trend", 
      dashed: true,
      priority: "secondary",
      description: "Prognostizierter Trend"
    },
    { 
      key: "Durchschnitt", 
      color: isDark ? "rgba(107, 114, 128, 0.4)" : "rgba(107, 114, 128, 0.3)", 
      label: "Durchschnitt", 
      dashed: true,
      priority: "secondary",
      description: "Durchschnittlicher Saldo"
    },
    // Optional: Detailed breakdown (can be toggled)
    { 
      key: "Einnahmen", 
      color: isDark ? "#34d399" : "#10b981", 
      label: "Einnahmen", 
      priority: "optional",
      description: "Monatliche Einnahmen"
    },
    { 
      key: "Ausgaben", 
      color: isDark ? "#f87171" : "#ef4444", 
      label: "Ausgaben", 
      priority: "optional",
      description: "Monatliche Ausgaben"
    },
  ].map(config => ({
    ...config,
    enabled: enabledLines[config.key] ?? (config.priority === "primary" || config.priority === "secondary")
  })), [isDark, enabledLines])

  const scenarioConfig = {
    best: {
      label: "Best Case",
      icon: Trophy,
      color: isDark ? "#34d399" : "#10b981",
      bgColor: isDark ? "rgba(52, 211, 153, 0.1)" : "rgba(16, 185, 129, 0.08)",
      borderColor: isDark ? "rgba(52, 211, 153, 0.3)" : "rgba(16, 185, 129, 0.25)",
      emoji: "🚀"
    },
    realistic: {
      label: "Realistisch",
      icon: Target,
      color: isDark ? "#60a5fa" : "#3b82f6",
      bgColor: isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(59, 130, 246, 0.08)",
      borderColor: isDark ? "rgba(96, 165, 250, 0.3)" : "rgba(59, 130, 246, 0.25)",
      emoji: "📊"
    },
    worst: {
      label: "Worst Case",
      icon: AlertTriangle,
      color: isDark ? "#f87171" : "#ef4444",
      bgColor: isDark ? "rgba(248, 113, 113, 0.1)" : "rgba(239, 68, 68, 0.08)",
      borderColor: isDark ? "rgba(248, 113, 113, 0.3)" : "rgba(239, 68, 68, 0.25)",
      emoji: "⚠️"
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "#f3f4f6"
  const textColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#6b7280"
  const tooltipBg = isDark ? "rgba(30, 30, 35, 0.98)" : "rgba(255, 255, 255, 0.98)"
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    // Filter by active line or show all enabled lines, prioritizing primary
    const visiblePayload = activeLine 
      ? payload.filter((p: any) => p.dataKey === activeLine)
      : payload
          .filter((p: any) => {
            const config = lineConfig.find(c => c.key === p.dataKey)
            return config && config.enabled
          })
          .sort((a: any, b: any) => {
            const configA = lineConfig.find(c => c.key === a.dataKey)
            const configB = lineConfig.find(c => c.key === b.dataKey)
            const priorityOrder = { primary: 0, secondary: 1, optional: 2 }
            return (priorityOrder[configA?.priority as keyof typeof priorityOrder] ?? 3) - 
                   (priorityOrder[configB?.priority as keyof typeof priorityOrder] ?? 3)
          })

    if (visiblePayload.length === 0) return null

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border backdrop-blur-xl shadow-2xl p-3 min-w-[200px]"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          boxShadow: isDark 
            ? "0 20px 40px rgba(0, 0, 0, 0.5)" 
            : "0 20px 40px rgba(0, 0, 0, 0.15)"
        }}
      >
        <p className="text-xs font-semibold mb-2.5 text-finsim-textMain dark:text-finsim-dark-textMain border-b border-finsim-borderLight dark:border-finsim-dark-borderLight pb-2">
          {label}
        </p>
        <div className="space-y-1.5">
          {visiblePayload.map((entry: any, index: number) => {
            const config = lineConfig.find(c => c.key === entry.dataKey)
            if (!config || !config.enabled) return null
            
            const isPrimary = config.priority === "primary"
            
            return (
              <div key={index} className={`flex items-center justify-between gap-3 ${isPrimary ? 'pb-1 border-b border-finsim-borderLight/50 dark:border-finsim-dark-borderLight/50' : ''}`}>
                <div className="flex items-center gap-2">
                  <div 
                    className={`rounded-full ${config.dashed ? 'w-2 h-0.5' : 'w-2 h-2'}`}
                    style={{ 
                      backgroundColor: config.color,
                      border: config.dashed ? `1px dashed ${config.color}` : 'none'
                    }}
                  />
                  <span className={`text-xs ${isPrimary ? 'font-semibold' : 'font-medium'} text-finsim-textSecondary dark:text-finsim-dark-textSecondary`}>
                    {config.label}:
                  </span>
                </div>
                <span 
                  className={`text-xs font-bold font-mono ${isPrimary ? 'text-base' : ''}`}
                  style={{ color: config.color }}
                >
                  {formatCurrency(entry.value ?? 0)}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  // Zoom handlers
  const handleZoomIn = () => {
    if (chartData.length === 0) return
    const currentStart = brushStartIndex
    const currentEnd = brushEndIndex
    const range = currentEnd - currentStart
    const newRange = Math.max(3, Math.floor(range * 0.7)) // Zoom in by 30%
    const center = (currentStart + currentEnd) / 2
    const newStart = Math.max(0, Math.floor(center - newRange / 2))
    const newEnd = Math.min(chartData.length - 1, Math.floor(center + newRange / 2))
    setBrushStartIndex(newStart)
    setBrushEndIndex(newEnd)
    setZoomDomain([newStart, newEnd])
  }

  const handleZoomOut = () => {
    if (chartData.length === 0) return
    const currentStart = brushStartIndex
    const currentEnd = brushEndIndex
    const range = currentEnd - currentStart
    const newRange = Math.min(chartData.length - 1, Math.floor(range * 1.5)) // Zoom out by 50%
    const center = (currentStart + currentEnd) / 2
    const newStart = Math.max(0, Math.floor(center - newRange / 2))
    const newEnd = Math.min(chartData.length - 1, Math.floor(center + newRange / 2))
    setBrushStartIndex(newStart)
    setBrushEndIndex(newEnd)
    setZoomDomain([newStart, newEnd])
  }

  const handleResetZoom = () => {
    setZoomDomain(null)
    setBrushStartIndex(0)
    setBrushEndIndex(chartData.length - 1)
  }

  const handleBrushChange = (domain: any) => {
    if (domain && typeof domain.startIndex === 'number' && typeof domain.endIndex === 'number') {
      const start = Math.max(0, Math.min(domain.startIndex, chartData.length - 1))
      const end = Math.max(0, Math.min(domain.endIndex, chartData.length - 1))
      if (start <= end) {
        setBrushStartIndex(start)
        setBrushEndIndex(end)
        setZoomDomain([start, end])
      }
    }
  }

  // Filter chart data based on zoom
  const visibleChartData = useMemo(() => {
    if (!zoomDomain || chartData.length === 0) return chartData
    return chartData.slice(zoomDomain[0], zoomDomain[1] + 1)
  }, [chartData, zoomDomain])

  const ChartContent = ({ height = "420px", showFullscreenButton = true }: { height?: string, showFullscreenButton?: boolean }) => (
    <div className="w-full space-y-6">
      {/* Header with scenario selector and period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
            {scenarioConfig[activeScenario].label} Projektion
          </h4>
          <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
            Detaillierte Finanzprognose
          </p>
        </div>
        <div className="flex items-center gap-2">
        {onMonthsAheadChange && (
          <div className="flex items-center gap-1 bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated rounded-lg p-1 border border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <span className="text-[10px] font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted px-2 uppercase tracking-wide">
              Periode:
            </span>
            {[1, 6, 12, 24].map((months) => {
              const isActive = monthsAhead === months
              return (
                <motion.button
                  key={months}
                  onClick={() => {
                    if (monthsAhead !== months) {
                      onMonthsAheadChange(months)
                    }
                  }}
                  whileHover={{ scale: isActive ? 1 : 1.05, y: isActive ? 0 : -1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    isActive
                      ? "text-white dark:text-white shadow-md"
                      : "text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-finsim-textMain dark:hover:text-finsim-dark-textMain hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted"
                  }`}
                  title={`${months} Monat${months > 1 ? 'e' : ''} Prognose`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePeriod"
                      className="absolute inset-0 rounded-md bg-finsim-primary dark:bg-finsim-dark-primary"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{months}M</span>
                </motion.button>
              )
            })}
          </div>
        )}
          {showFullscreenButton && (
            <motion.button
              onClick={() => setIsFullscreen(true)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors border border-finsim-borderLight dark:border-finsim-dark-borderLight hover:border-finsim-primary/30 dark:hover:border-finsim-dark-primary/30"
              aria-label="Vollbild"
              title="Vollbild öffnen"
            >
              <Maximize2 className="h-4 w-4 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Scenario Selection Buttons */}
      <div className="grid grid-cols-3 gap-2.5">
        {(["best", "realistic", "worst"] as const).map((scenarioKey) => {
          const config = scenarioConfig[scenarioKey]
          const Icon = config.icon
          const isActive = activeScenario === scenarioKey

          return (
            <motion.button
              key={scenarioKey}
              onClick={() => {
                setActiveScenario(scenarioKey)
                setActiveLine(null) // Reset active line when switching scenarios
              }}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className={`relative p-3.5 rounded-xl border transition-all duration-200 overflow-hidden ${
                isActive
                  ? "border-finsim-primary dark:border-finsim-dark-primary shadow-md bg-white/50 dark:bg-white/5"
                  : "border-finsim-borderLight dark:border-finsim-dark-borderLight hover:border-finsim-primary/30 dark:hover:border-finsim-dark-primary/30 bg-white/30 dark:bg-white/3"
              }`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: config.color, opacity: isActive ? 1 : 0.7 }} />
                  <span className="text-xs font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
                    {config.label}
                  </span>
                </div>
                <span className="text-base opacity-80">{config.emoji}</span>
              </div>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${config.color}08, ${config.color}03)`,
                  }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Line Toggle Buttons - Organized by priority */}
      <div className="space-y-2">
        {/* Primary Lines */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wider">
            Hauptlinien:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {lineConfig.filter(c => c.priority === "primary").map((config) => (
              <button
                key={config.key}
                onClick={() => setActiveLine(activeLine === config.key ? null : config.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                  (activeLine === config.key || activeLine === null) && config.enabled
                    ? config.key === "Kumuliert"
                      ? isDark 
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : isDark
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    : "opacity-30 hover:opacity-60 text-finsim-textSecondary dark:text-finsim-dark-textSecondary"
                }`}
                title={config.description}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: config.color }}
                />
                <span>{config.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Optional Lines */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wider">
            Details:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {lineConfig.filter(c => c.priority === "optional" || c.priority === "secondary").map((config) => (
              <button
                key={config.key}
                onClick={() => {
                  setEnabledLines(prev => ({
                    ...prev,
                    [config.key]: !prev[config.key]
                  }))
                  setActiveLine(null)
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                  config.enabled
                    ? config.key === "Einnahmen"
                      ? isDark 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : config.key === "Ausgaben"
                      ? isDark
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-red-50 text-red-700 border border-red-200"
                      : config.key === "Kontostand"
                      ? isDark
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                      : config.key === "Trend"
                      ? isDark
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                      : isDark
                        ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                        : "bg-gray-50 text-gray-700 border border-gray-200"
                    : "opacity-30 hover:opacity-60 text-finsim-textSecondary dark:text-finsim-dark-textSecondary border border-transparent"
                }`}
                title={config.description}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: config.color }}
                />
                <span>{config.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zoom Controls (only in fullscreen) */}
      {isFullscreen && (
        <div className="flex items-center gap-2 p-3 bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated rounded-lg border border-finsim-borderLight dark:border-finsim-dark-borderLight">
          <span className="text-xs font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted">
            Zoom:
          </span>
          <motion.button
            onClick={handleZoomIn}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-md hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted transition-colors"
            title="Vergrößern"
          >
            <ZoomIn className="h-4 w-4 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
          </motion.button>
          <motion.button
            onClick={handleZoomOut}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-md hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted transition-colors"
            title="Verkleinern"
          >
            <ZoomOut className="h-4 w-4 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
          </motion.button>
          <motion.button
            onClick={handleResetZoom}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-md hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted transition-colors"
            title="Zurücksetzen"
          >
            <RotateCcw className="h-4 w-4 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
          </motion.button>
          {zoomDomain && (
            <span className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted ml-2">
              {zoomDomain[1] - zoomDomain[0] + 1} von {chartData.length} Monaten
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={visibleChartData}
            onMouseLeave={() => setActiveLine(null)}
            margin={{ top: 5, right: 10, left: 0, bottom: isFullscreen ? 60 : 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={gridColor} 
              opacity={isDark ? 0.2 : 0.4}
            />
            <XAxis 
              dataKey="month" 
              tick={{ 
                fontSize: 11, 
                fill: textColor,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 500
              }}
              tickLine={{ stroke: gridColor }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              tick={{ 
                fontSize: 11, 
                fill: textColor,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 500
              }}
              tickLine={{ stroke: gridColor }}
              axisLine={{ stroke: gridColor }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              y={0} 
              stroke={isDark ? "rgba(255, 255, 255, 0.2)" : "#d1d5db"} 
              strokeDasharray="2 2"
              strokeWidth={1}
            />
            {lineConfig
              .filter(config => config.enabled && visibleChartData.some(d => (d as any)[config.key] !== undefined))
              .map((config) => (
                <Line
                  key={config.key}
                  type="monotone"
                  dataKey={config.key}
                  stroke={config.color}
                  strokeWidth={
                    config.priority === "primary"
                      ? activeLine === null || activeLine === config.key ? 3 : 2
                      : activeLine === null || activeLine === config.key ? 2 : 1.5
                  }
                  strokeDasharray={config.dashed ? "5 5" : undefined}
                  dot={false}
                  activeDot={{ 
                    r: config.priority === "primary" ? 7 : 5, 
                    fill: config.color,
                    stroke: isDark ? 'rgba(30, 30, 35, 1)' : '#fff',
                    strokeWidth: 2,
                    style: { transition: 'all 0.2s ease' }
                  }}
                  opacity={
                    activeLine === null 
                      ? config.priority === "primary" ? 1 : 0.6
                      : activeLine === config.key 
                        ? 1 
                        : 0.2
                  }
                  onMouseEnter={() => setActiveLine(config.key)}
                  isAnimationActive={true}
                  animationDuration={config.priority === "primary" ? 1200 : 1000}
                  animationEasing="ease-out"
                  style={{ transition: 'opacity 0.3s ease, stroke-width 0.3s ease' }}
                />
              ))}
            {/* Brush for zooming in fullscreen */}
            {isFullscreen && chartData.length > 0 && (() => {
              const safeStartIndex = Math.max(0, Math.min(brushStartIndex || 0, chartData.length - 1))
              const safeEndIndex = Math.max(safeStartIndex, Math.min(brushEndIndex || chartData.length - 1, chartData.length - 1))
              
              return (
                <Brush
                  dataKey="month"
                  height={30}
                  stroke={isDark ? "rgba(255, 255, 255, 0.2)" : "#d1d5db"}
                  fill={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}
                  startIndex={safeStartIndex}
                  endIndex={safeEndIndex}
                  onChange={(domain: any) => {
                    if (domain && 
                        typeof domain.startIndex === 'number' && 
                        !isNaN(domain.startIndex) &&
                        typeof domain.endIndex === 'number' && 
                        !isNaN(domain.endIndex)) {
                      handleBrushChange(domain)
                    }
                  }}
                  tickFormatter={(value: any, index: number) => {
                    if (typeof index === 'number' && !isNaN(index) && index >= 0 && index < chartData.length && chartData[index]) {
                      return chartData[index].month || String(value || '')
                    }
                    return String(value || '')
                  }}
                />
              )
            })()}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Insights - Gamified & Minimalist */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, staggerChildren: 0.1 }}
        className="space-y-4"
      >
        {/* Primary Metrics - Hero Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Finaler Saldo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`relative p-4 rounded-xl border-2 overflow-hidden ${
              financialInsights.final >= 0
                ? "bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800/50"
                : "bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800/50"
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <Wallet className={`h-4 w-4 ${financialInsights.final >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
                {financialInsights.final >= 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">✓ POSITIV</span>
                  </motion.div>
                )}
              </div>
              <p className="text-[10px] font-semibold text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wider mb-1">
                Finaler Saldo
              </p>
              <p className={`text-xl font-bold font-mono ${financialInsights.final >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                {formatCurrency(financialInsights.final)}
              </p>
            </div>
            {financialInsights.final >= 0 && (
              <motion.div
                className="absolute top-0 right-0 w-20 h-20 bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-2xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            )}
          </motion.div>

          {/* Wachstum */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className={`relative p-4 rounded-xl border-2 overflow-hidden ${
              financialInsights.growth >= 0
                ? "bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50"
                : "bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800/50"
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                {financialInsights.growth >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                {financialInsights.growthPct > 50 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 rounded-full bg-blue-500/20 dark:bg-blue-500/30"
                  >
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">🚀 TOP</span>
                  </motion.div>
                )}
              </div>
              <p className="text-[10px] font-semibold text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wider mb-1">
                Wachstum
              </p>
              <div className="flex items-center gap-1.5">
                {financialInsights.growth >= 0 ? (
                  <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                )}
                <p className={`text-xl font-bold font-mono ${financialInsights.growth >= 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}>
                  {formatCurrency(financialInsights.growth)}
                </p>
              </div>
              <p className={`text-xs font-medium mt-1 ${financialInsights.growthPct >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                {formatPercent(financialInsights.growthPct)}
              </p>
            </div>
          </motion.div>

          {/* Sparquote */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`relative p-4 rounded-xl border-2 overflow-hidden ${
              financialInsights.savingsRate >= 0
                ? "bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800/50"
                : "bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/50"
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <PiggyBank className={`h-4 w-4 ${financialInsights.savingsRate >= 0 ? "text-purple-600 dark:text-purple-400" : "text-orange-600 dark:text-orange-400"}`} />
                {financialInsights.savingsRate >= 20 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 rounded-full bg-purple-500/20 dark:bg-purple-500/30"
                  >
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">⭐ EXZELLENT</span>
                  </motion.div>
                )}
              </div>
              <p className="text-[10px] font-semibold text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wider mb-1">
                Sparquote
              </p>
              <p className={`text-xl font-bold font-mono ${financialInsights.savingsRate >= 0 ? "text-purple-700 dark:text-purple-300" : "text-orange-700 dark:text-orange-300"}`}>
                {formatPercent(financialInsights.savingsRate)}
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-finsim-surfaceMuted dark:bg-finsim-dark-surfaceMuted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, financialInsights.savingsRate))}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-full rounded-full ${
                    financialInsights.savingsRate >= 0
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500"
                      : "bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500"
                  }`}
                />
              </div>
            </div>
          </motion.div>

          {/* Monatssaldo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className={`relative p-4 rounded-xl border-2 overflow-hidden ${
              financialInsights.avgMonthly >= 0
                ? "bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 dark:from-indigo-950/30 dark:to-indigo-900/20 border-indigo-200 dark:border-indigo-800/50"
                : "bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800/50"
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className={`h-4 w-4 ${financialInsights.avgMonthly >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-red-600 dark:text-red-400"}`} />
                {financialInsights.avgMonthly >= 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 rounded-full bg-indigo-500/20 dark:bg-indigo-500/30"
                  >
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">📈 STABIL</span>
                  </motion.div>
                )}
              </div>
              <p className="text-[10px] font-semibold text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wider mb-1">
                Ø Monatssaldo
              </p>
              <p className={`text-xl font-bold font-mono ${financialInsights.avgMonthly >= 0 ? "text-indigo-700 dark:text-indigo-300" : "text-red-700 dark:text-red-300"}`}>
                {formatCurrency(financialInsights.avgMonthly)}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Secondary Metrics - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-finsim-surfaceElevated/50 dark:bg-finsim-dark-surfaceElevated/50 border border-finsim-borderLight/50 dark:border-finsim-dark-borderLight/50"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wide">
                Ø Einnahmen
              </p>
              <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(financialInsights.avgIncome)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
              <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wide">
                Ø Ausgaben
              </p>
              <p className="text-sm font-bold font-mono text-red-600 dark:text-red-400">
                {formatCurrency(financialInsights.avgExpense)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* AI Insights - Based on AI Analysis */}
        {aiAnalysis && (aiAnalysis.summary || aiAnalysis.plausibility) && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-4 rounded-xl bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200/50 dark:border-purple-800/30"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h5 className="text-xs font-semibold text-purple-900 dark:text-purple-200 uppercase tracking-wide">
                KI-Empfehlungen
              </h5>
            </div>
            {aiAnalysis.summary && (
              <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed mb-2">
                {aiAnalysis.summary}
              </p>
            )}
            {aiAnalysis.plausibility && (
              <div className="mt-2 pt-2 border-t border-purple-200/50 dark:border-purple-800/30">
                <p className="text-[10px] font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-1.5">
                  Plausibilitätsanalyse:
                </p>
                <p className="text-xs text-purple-800/90 dark:text-purple-300/90 leading-relaxed">
                  {aiAnalysis.plausibility}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )

  return (
    <>
      <div className="glass-effect premium-shadow rounded-2xl p-6 sm:p-8">
        <ChartContent />
      </div>

      {/* Fullscreen Modal - Enhanced */}
      <AnimatePresence mode="wait">
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/70 dark:bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-7xl h-full max-h-[95vh] bg-finsim-surface dark:bg-finsim-dark-surface rounded-2xl border-2 border-finsim-border dark:border-finsim-dark-border shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fullscreen Header */}
              <div className="flex items-center justify-between p-6 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-finsim-primary/10 dark:bg-finsim-dark-primary/20">
                    {(() => {
                      const IconComponent = scenarioConfig[activeScenario].icon
                      return IconComponent ? (
                        <IconComponent 
                          className="h-5 w-5" 
                          style={{ color: scenarioConfig[activeScenario].color }} 
                        />
                      ) : null
                    })()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-finsim-textMain dark:text-finsim-dark-textMain">
                      {scenarioConfig[activeScenario].label} Projektion
                    </h3>
                    <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                      {monthsAhead}-Monats-Vorschau
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setIsFullscreen(false)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2.5 rounded-lg hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted transition-colors border border-finsim-borderLight dark:border-finsim-dark-borderLight"
                  aria-label="Schließen"
                  title="Vollbild schließen (ESC)"
                >
                  <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
                </motion.button>
              </div>

              {/* Fullscreen Content */}
              <div className="flex-1 overflow-auto p-6">
                <div className="h-full min-h-[600px]">
                  <ChartContent height="calc(95vh - 200px)" showFullscreenButton={false} />
                </div>
              </div>

              {/* ESC hint */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 dark:bg-white/10 backdrop-blur-sm border border-white/10">
                <p className="text-[10px] text-white/70 dark:text-white/60 font-medium">
                  Drücke ESC zum Schließen
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
