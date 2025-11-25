"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  LineChart,
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from "recharts"
import { ScenarioProjection } from "@/lib/api"
import { motion } from "framer-motion"
import { Trophy, Target, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react"

interface ScenarioComparisonChartProps {
  bestCase: ScenarioProjection[]
  realisticCase: ScenarioProjection[]
  worstCase: ScenarioProjection[]
  monthsAhead?: number
  onMonthsAheadChange?: (months: number) => void
}

type ScenarioType = "best" | "realistic" | "worst" | "all"

export function ScenarioComparisonChart({ 
  bestCase, 
  realisticCase, 
  worstCase,
  monthsAhead = 12,
  onMonthsAheadChange
}: ScenarioComparisonChartProps) {
  const [isDark, setIsDark] = useState(false)
  const [activeScenario, setActiveScenario] = useState<ScenarioType>("all")
  const [activeLine, setActiveLine] = useState<string | null>(null)

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

  // Validate data
  if (!bestCase || !realisticCase || !worstCase || 
      bestCase.length === 0 || realisticCase.length === 0 || worstCase.length === 0) {
    return (
      <div className="glass-effect premium-shadow rounded-xl p-5 sm:p-6">
        <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textMuted">
          Keine Daten verfügbar
        </p>
      </div>
    )
  }

  // Get current scenario projections based on selection
  const currentProjections = useMemo(() => {
    if (activeScenario === "best") return bestCase
    if (activeScenario === "realistic") return realisticCase
    if (activeScenario === "worst") return worstCase
    return null // "all" mode
  }, [activeScenario, bestCase, realisticCase, worstCase])

  // Prepare chart data based on mode
  const chartData = useMemo(() => {
    if (activeScenario === "all") {
      // Comparison mode: show cumulative balances
      const maxLength = Math.min(bestCase.length, realisticCase.length, worstCase.length)
      const data: any[] = []

      for (let i = 0; i < maxLength; i++) {
        const best = bestCase[i]
        const realistic = realisticCase[i]
        const worst = worstCase[i]

        if (!best || !realistic || !worst) continue

        const bestCumulative = Number(best.cumulative_balance ?? 0) || 0
        const realisticCumulative = Number(realistic.cumulative_balance ?? 0) || 0
        const worstCumulative = Number(worst.cumulative_balance ?? 0) || 0
        const average = (bestCumulative + realisticCumulative + worstCumulative) / 3

        // Ensure no NaN or Infinity values
        const safeBest = isNaN(bestCumulative) || !isFinite(bestCumulative) ? 0 : bestCumulative
        const safeRealistic = isNaN(realisticCumulative) || !isFinite(realisticCumulative) ? 0 : realisticCumulative
        const safeWorst = isNaN(worstCumulative) || !isFinite(worstCumulative) ? 0 : worstCumulative
        const safeAverage = isNaN(average) || !isFinite(average) ? 0 : average

        data.push({
          month: best.month || `M${i + 1}`,
          "Best Case": safeBest,
          "Realistisch": safeRealistic,
          "Worst Case": safeWorst,
          "Durchschnitt": safeAverage,
        })
      }

      // Debug logging
      if (data.length > 0) {
        console.log('📊 Chart Data (all mode):', {
          length: data.length,
          first: data[0],
          last: data[data.length - 1],
          keys: Object.keys(data[0]),
          sampleValues: {
            best: data[0]["Best Case"],
            realistic: data[0]["Realistisch"],
            worst: data[0]["Worst Case"],
            avg: data[0]["Durchschnitt"]
          }
        })
      } else {
        console.warn('⚠️ No chart data generated for all mode')
      }

      return data
    } else {
      // Single scenario mode: show detailed breakdown
      if (!currentProjections || currentProjections.length === 0) {
        console.log('⚠️ No current projections for scenario:', activeScenario)
        return []
      }
      
      const data = currentProjections.map((p, idx) => {
        const einnahmen = Number(p.projected_income ?? 0) || 0
        const ausgaben = Number(Math.abs(p.projected_expenses ?? 0)) || 0
        const saldo = Number(p.projected_balance ?? 0) || 0
        const kumuliert = Number(p.cumulative_balance ?? 0) || 0

        return {
          month: p.month || `M${idx + 1}`,
          Einnahmen: isNaN(einnahmen) || !isFinite(einnahmen) ? 0 : einnahmen,
          Ausgaben: isNaN(ausgaben) || !isFinite(ausgaben) ? 0 : ausgaben,
          Saldo: isNaN(saldo) || !isFinite(saldo) ? 0 : saldo,
          Kumuliert: isNaN(kumuliert) || !isFinite(kumuliert) ? 0 : kumuliert,
        }
      })

      // Debug logging
      if (data.length > 0) {
        console.log('📊 Chart Data (single mode):', {
          scenario: activeScenario,
          length: data.length,
          first: data[0],
          keys: Object.keys(data[0]),
          sampleValues: {
            einnahmen: data[0].Einnahmen,
            ausgaben: data[0].Ausgaben,
            saldo: data[0].Saldo,
            kumuliert: data[0].Kumuliert
          }
        })
      } else {
        console.warn('⚠️ No chart data generated for single mode:', activeScenario)
      }

      return data
    }
  }, [activeScenario, bestCase, realisticCase, worstCase, currentProjections])

  // Debug: Log chart data changes
  useEffect(() => {
    if (chartData && chartData.length > 0) {
      console.log('✅ Chart data ready:', {
        mode: activeScenario,
        length: chartData.length,
        firstItem: chartData[0],
        keys: Object.keys(chartData[0])
      })
    } else {
      console.warn('⚠️ No chart data available')
    }
  }, [chartData, activeScenario])

  // Line configuration for single scenario view
  const lineConfig = [
    { key: "Einnahmen", color: isDark ? "#34d399" : "#10b981", label: "Einnahmen", enabled: true },
    { key: "Ausgaben", color: isDark ? "#f87171" : "#ef4444", label: "Ausgaben", enabled: true },
    { key: "Saldo", color: isDark ? "#60a5fa" : "#3b82f6", label: "Saldo", enabled: true },
    { key: "Kumuliert", color: isDark ? "#818cf8" : "#6366f1", label: "Kumuliert", enabled: true, dashed: true },
  ]

  // Calculate comprehensive financial insights
  const financialInsights = useMemo(() => {
    const bestFinal = bestCase[bestCase.length - 1]?.cumulative_balance ?? 0
    const realisticFinal = realisticCase[realisticCase.length - 1]?.cumulative_balance ?? 0
    const worstFinal = worstCase[worstCase.length - 1]?.cumulative_balance ?? 0

    const initialBalance = bestCase[0]?.cumulative_balance ?? 0

    // Growth metrics
    const bestGrowth = bestFinal - initialBalance
    const realisticGrowth = realisticFinal - initialBalance
    const worstGrowth = worstFinal - initialBalance

    // Growth percentage
    const bestGrowthPct = initialBalance !== 0 ? (bestGrowth / Math.abs(initialBalance)) * 100 : 0
    const realisticGrowthPct = initialBalance !== 0 ? (realisticGrowth / Math.abs(initialBalance)) * 100 : 0
    const worstGrowthPct = initialBalance !== 0 ? (worstGrowth / Math.abs(initialBalance)) * 100 : 0

    // Average monthly balance
    const bestAvgMonthly = bestCase.reduce((sum, p) => sum + (p.projected_balance ?? 0), 0) / bestCase.length
    const realisticAvgMonthly = realisticCase.reduce((sum, p) => sum + (p.projected_balance ?? 0), 0) / realisticCase.length
    const worstAvgMonthly = worstCase.reduce((sum, p) => sum + (p.projected_balance ?? 0), 0) / worstCase.length

    // Total income and expenses
    const bestTotalIncome = bestCase.reduce((sum, p) => sum + (p.projected_income ?? 0), 0)
    const realisticTotalIncome = realisticCase.reduce((sum, p) => sum + (p.projected_income ?? 0), 0)
    const worstTotalIncome = worstCase.reduce((sum, p) => sum + (p.projected_income ?? 0), 0)

    const bestTotalExpense = bestCase.reduce((sum, p) => sum + Math.abs(p.projected_expenses ?? 0), 0)
    const realisticTotalExpense = realisticCase.reduce((sum, p) => sum + Math.abs(p.projected_expenses ?? 0), 0)
    const worstTotalExpense = worstCase.reduce((sum, p) => sum + Math.abs(p.projected_expenses ?? 0), 0)

    // Savings rate
    const bestSavingsRate = bestTotalIncome > 0 ? ((bestTotalIncome - bestTotalExpense) / bestTotalIncome) * 100 : 0
    const realisticSavingsRate = realisticTotalIncome > 0 ? ((realisticTotalIncome - realisticTotalExpense) / realisticTotalIncome) * 100 : 0
    const worstSavingsRate = worstTotalIncome > 0 ? ((worstTotalIncome - worstTotalExpense) / worstTotalIncome) * 100 : 0

    // Monthly averages
    const bestAvgIncome = bestTotalIncome / bestCase.length
    const realisticAvgIncome = realisticTotalIncome / realisticCase.length
    const worstAvgIncome = worstTotalIncome / worstCase.length

    const bestAvgExpense = bestTotalExpense / bestCase.length
    const realisticAvgExpense = realisticTotalExpense / realisticCase.length
    const worstAvgExpense = worstTotalExpense / worstCase.length

    return {
      best: {
        final: bestFinal,
        growth: bestGrowth,
        growthPct: bestGrowthPct,
        avgMonthly: bestAvgMonthly,
        savingsRate: bestSavingsRate,
        totalIncome: bestTotalIncome,
        totalExpense: bestTotalExpense,
        avgIncome: bestAvgIncome,
        avgExpense: bestAvgExpense,
      },
      realistic: {
        final: realisticFinal,
        growth: realisticGrowth,
        growthPct: realisticGrowthPct,
        avgMonthly: realisticAvgMonthly,
        savingsRate: realisticSavingsRate,
        totalIncome: realisticTotalIncome,
        totalExpense: realisticTotalExpense,
        avgIncome: realisticAvgIncome,
        avgExpense: realisticAvgExpense,
      },
      worst: {
        final: worstFinal,
        growth: worstGrowth,
        growthPct: worstGrowthPct,
        avgMonthly: worstAvgMonthly,
        savingsRate: worstSavingsRate,
        totalIncome: worstTotalIncome,
        totalExpense: worstTotalExpense,
        avgIncome: worstAvgIncome,
        avgExpense: worstAvgExpense,
      },
      initialBalance
    }
  }, [bestCase, realisticCase, worstCase])

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
  const textColor = isDark ? "rgba(255, 255, 255, 0.65)" : "#6b7280"
  const tooltipBg = isDark ? "rgba(20, 20, 25, 0.98)" : "rgba(255, 255, 255, 0.98)"
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const visiblePayload = activeScenario === "all"
      ? payload
      : activeLine
        ? payload.filter((p: any) => p.dataKey === activeLine)
        : payload.filter((p: any) => lineConfig.find(c => c.key === p.dataKey)?.enabled)

    if (visiblePayload.length === 0) return null

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg border backdrop-blur-xl shadow-2xl p-3 min-w-[200px]"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          boxShadow: isDark 
            ? "0 20px 40px rgba(0, 0, 0, 0.5)" 
            : "0 20px 40px rgba(0, 0, 0, 0.15)"
        }}
      >
        <p className="text-xs font-semibold mb-2.5 text-finsim-textMain dark:text-finsim-dark-textMain opacity-80">
          {label}
        </p>
        <div className="space-y-1.5">
          {visiblePayload.map((entry: any, index: number) => {
            if (activeScenario === "all") {
              const color = entry.color || "#666"
              return (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary font-medium">
                      {entry.name || entry.dataKey}:
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono" style={{ color }}>
                    {formatCurrency(entry.value ?? 0)}
                  </span>
                </div>
              )
            } else {
              const config = lineConfig.find(c => c.key === entry.dataKey)
              if (!config || !config.enabled) return null
              return (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                    {config.label}:
                  </span>
                  <span 
                    className="text-xs font-bold font-mono"
                    style={{ color: config.color }}
                  >
                    {formatCurrency(entry.value ?? 0)}
                  </span>
                </div>
              )
            }
          })}
        </div>
      </motion.div>
    )
  }

  const scenarioConfig = {
    best: {
      label: "Best Case",
      icon: Trophy,
      color: isDark ? "#34d399" : "#10b981",
      lightColor: isDark ? "rgba(52, 211, 153, 0.15)" : "rgba(16, 185, 129, 0.1)",
      bgColor: isDark ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.06)",
      borderColor: isDark ? "rgba(52, 211, 153, 0.25)" : "rgba(16, 185, 129, 0.2)",
      insights: financialInsights.best,
      emoji: "🚀"
    },
    realistic: {
      label: "Realistisch",
      icon: Target,
      color: isDark ? "#60a5fa" : "#3b82f6",
      lightColor: isDark ? "rgba(96, 165, 250, 0.15)" : "rgba(59, 130, 246, 0.1)",
      bgColor: isDark ? "rgba(96, 165, 250, 0.08)" : "rgba(59, 130, 246, 0.06)",
      borderColor: isDark ? "rgba(96, 165, 250, 0.25)" : "rgba(59, 130, 246, 0.2)",
      insights: financialInsights.realistic,
      emoji: "📊"
    },
    worst: {
      label: "Worst Case",
      icon: AlertTriangle,
      color: isDark ? "#f87171" : "#ef4444",
      lightColor: isDark ? "rgba(248, 113, 113, 0.15)" : "rgba(239, 68, 68, 0.1)",
      bgColor: isDark ? "rgba(248, 113, 113, 0.08)" : "rgba(239, 68, 68, 0.06)",
      borderColor: isDark ? "rgba(248, 113, 113, 0.25)" : "rgba(239, 68, 68, 0.2)",
      insights: financialInsights.worst,
      emoji: "⚠️"
    }
  }

  return (
    <div className="glass-effect premium-shadow rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-xl font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
            {activeScenario === "all" ? "Finanzprognose" : `${scenarioConfig[activeScenario].label} Projektion`}
          </h4>
          <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium">
            {activeScenario === "all" ? "Vergleich der drei Szenarien" : "Detaillierte Finanzprognose"}
          </p>
        </div>
        {onMonthsAheadChange && (
          <div className="flex items-center gap-0.5 bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated rounded-lg p-0.5 border border-finsim-borderLight dark:border-finsim-dark-borderLight">
            {[1, 6, 12, 24].map((months) => (
              <motion.button
                key={months}
                onClick={() => onMonthsAheadChange(months)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  monthsAhead === months
                    ? "bg-finsim-primary text-white dark:bg-finsim-dark-primary shadow-sm"
                    : "text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-finsim-textMain dark:hover:text-finsim-dark-textMain hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted"
                }`}
              >
                {months}M
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Scenario Selection Buttons */}
      <div className="grid grid-cols-3 gap-2.5">
        {(["best", "realistic", "worst"] as const).map((scenarioKey) => {
          const config = scenarioConfig[scenarioKey]
          const Icon = config.icon
          const isActive = activeScenario === scenarioKey
          const isPositive = config.insights.final >= 0

          return (
            <motion.button
              key={scenarioKey}
              onClick={() => {
                setActiveScenario(isActive ? "all" : scenarioKey)
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
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4" style={{ color: config.color, opacity: isActive ? 1 : 0.7 }} />
                  <span className="text-base opacity-80">{config.emoji}</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
                    {config.label}
                  </p>
                </div>
                <div>
                  <span 
                    className={`text-sm font-bold font-mono ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {formatCurrency(config.insights.final)}
                  </span>
                </div>
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

      {/* Line Toggle Buttons (only for single scenario) */}
      {activeScenario !== "all" && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {lineConfig.map((config) => (
            <button
              key={config.key}
              onClick={() => setActiveLine(activeLine === config.key ? null : config.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                (activeLine === config.key || activeLine === null) && config.enabled
                  ? config.key === "Einnahmen"
                    ? isDark 
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : config.key === "Ausgaben"
                    ? isDark
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-red-50 text-red-700 border border-red-200"
                    : config.key === "Saldo"
                    ? isDark
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                    : isDark
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "opacity-30 hover:opacity-60 text-finsim-textSecondary dark:text-finsim-dark-textSecondary"
              }`}
            >
              <div 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: config.color }}
              />
              <span>{config.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="h-[420px] min-h-[420px] w-full -mx-2">
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              onMouseLeave={() => setActiveLine(null)}
              margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
              key={`chart-${activeScenario}-${chartData.length}`}
            >
              <CartesianGrid 
                strokeDasharray="2 2" 
                stroke={gridColor} 
                opacity={isDark ? 0.12 : 0.25}
                vertical={false}
              />
              <XAxis 
                dataKey="month" 
                tick={{ 
                  fontSize: 10, 
                  fill: textColor,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 500
                }}
                tickLine={false}
                axisLine={{ stroke: gridColor, strokeWidth: 1 }}
              />
              <YAxis 
                tickFormatter={(value) => {
                  if (Math.abs(value) >= 1000) {
                    return `${(value / 1000).toFixed(0)}k`
                  }
                  return value.toFixed(0)
                }}
                tick={{ 
                  fontSize: 10, 
                  fill: textColor,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 500
                }}
                tickLine={false}
                axisLine={{ stroke: gridColor, strokeWidth: 1 }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '15px', fontSize: '11px' }}
                iconType="line"
                formatter={(value) => <span style={{ fontSize: '10px', color: textColor, fontWeight: 500 }}>{value}</span>}
              />
              
              <ReferenceLine 
                y={0} 
                stroke={isDark ? "rgba(255, 255, 255, 0.12)" : "#e5e7eb"} 
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              
              {activeScenario === "all" ? (
                <>
                  {/* Comparison mode: show all scenarios */}
                  <Line
                    type="monotone"
                    dataKey="Best Case"
                    stroke={isDark ? "#34d399" : "#10b981"}
                    strokeWidth={activeLine === null || activeLine === "Best Case" ? 2.5 : 1.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 1.5, fill: isDark ? "#34d399" : "#10b981" }}
                    connectNulls={true}
                    name="Best Case"
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    strokeLinecap="round"
                    opacity={activeLine === null || activeLine === "Best Case" ? 1 : 0.3}
                    onMouseEnter={() => setActiveLine("Best Case")}
                    style={{ transition: 'opacity 0.3s ease, stroke-width 0.3s ease' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Realistisch"
                    stroke={isDark ? "#60a5fa" : "#3b82f6"}
                    strokeWidth={activeLine === null || activeLine === "Realistisch" ? 2.5 : 1.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 1.5, fill: isDark ? "#60a5fa" : "#3b82f6" }}
                    connectNulls={true}
                    name="Realistisch"
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    strokeLinecap="round"
                    opacity={activeLine === null || activeLine === "Realistisch" ? 1 : 0.3}
                    onMouseEnter={() => setActiveLine("Realistisch")}
                    style={{ transition: 'opacity 0.3s ease, stroke-width 0.3s ease' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Worst Case"
                    stroke={isDark ? "#f87171" : "#ef4444"}
                    strokeWidth={activeLine === null || activeLine === "Worst Case" ? 2.5 : 1.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 1.5, fill: isDark ? "#f87171" : "#ef4444" }}
                    connectNulls={true}
                    name="Worst Case"
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    strokeLinecap="round"
                    opacity={activeLine === null || activeLine === "Worst Case" ? 1 : 0.3}
                    onMouseEnter={() => setActiveLine("Worst Case")}
                    style={{ transition: 'opacity 0.3s ease, stroke-width 0.3s ease' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Durchschnitt"
                    stroke={isDark ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)"}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4, fill: isDark ? "rgba(139, 92, 246, 0.6)" : "rgba(139, 92, 246, 0.5)" }}
                    connectNulls={true}
                    name="Durchschnitt"
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    opacity={0.6}
                  />
                </>
              ) : (
                <>
                  {/* Single scenario mode: show detailed breakdown */}
                  {lineConfig.map((config) => (
                    <Line
                      key={config.key}
                      type="monotone"
                      dataKey={config.key}
                      stroke={config.color}
                      strokeWidth={activeLine === null || activeLine === config.key ? 2.5 : 1.5}
                      strokeDasharray={config.dashed ? "6 4" : undefined}
                      dot={false}
                      activeDot={{ 
                        r: 6, 
                        fill: config.color,
                        stroke: isDark ? 'rgba(30, 30, 35, 1)' : '#fff',
                        strokeWidth: 2,
                        style: { transition: 'all 0.2s ease' }
                      }}
                      opacity={(activeLine === null || activeLine === config.key) && config.enabled ? 1 : 0.3}
                      onMouseEnter={() => setActiveLine(config.key)}
                      connectNulls={true}
                      name={config.label}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                      style={{ transition: 'opacity 0.3s ease, stroke-width 0.3s ease' }}
                    />
                  ))}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textMuted">
              Keine Daten zum Anzeigen
            </p>
          </div>
        )}
      </div>

      {/* Financial Insights - Professional metrics */}
      {activeScenario !== "all" ? (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <div className="space-y-0.5">
              <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium uppercase tracking-wide">
                Finaler Saldo
              </p>
              <p className={`text-base font-bold font-mono ${scenarioConfig[activeScenario].insights.final >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {formatCurrency(scenarioConfig[activeScenario].insights.final)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium uppercase tracking-wide">
                Wachstum
              </p>
              <p className={`text-base font-bold font-mono flex items-center gap-1 ${scenarioConfig[activeScenario].insights.growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {scenarioConfig[activeScenario].insights.growth >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                {formatCurrency(scenarioConfig[activeScenario].insights.growth)}
              </p>
            </div>
            <div className="space-y-0.5 hidden md:block">
              <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium uppercase tracking-wide">
                Wachstum %
              </p>
              <p className={`text-base font-bold font-mono ${scenarioConfig[activeScenario].insights.growthPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {formatPercent(scenarioConfig[activeScenario].insights.growthPct)}
              </p>
            </div>
            <div className="space-y-0.5 hidden md:block">
              <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium uppercase tracking-wide">
                Sparquote
              </p>
              <p className={`text-base font-bold font-mono ${scenarioConfig[activeScenario].insights.savingsRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {formatPercent(scenarioConfig[activeScenario].insights.savingsRate)}
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <div className="space-y-0.5">
              <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium uppercase tracking-wide">
                Ø Einnahmen/Monat
              </p>
              <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(scenarioConfig[activeScenario].insights.avgIncome)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium uppercase tracking-wide">
                Ø Ausgaben/Monat
              </p>
              <p className="text-sm font-bold font-mono text-red-600 dark:text-red-400">
                {formatCurrency(scenarioConfig[activeScenario].insights.avgExpense)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium uppercase tracking-wide">
                Ø Monatssaldo
              </p>
              <p className={`text-sm font-bold font-mono ${scenarioConfig[activeScenario].insights.avgMonthly >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {formatCurrency(scenarioConfig[activeScenario].insights.avgMonthly)}
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight">
          {(["best", "realistic", "worst"] as const).map((key) => {
            const config = scenarioConfig[key]
            return (
              <div key={key} className="space-y-1 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                  <span className="text-[10px] font-semibold text-finsim-textMain dark:text-finsim-dark-textMain uppercase tracking-wide">
                    {config.label}
                  </span>
                </div>
                <p className={`text-sm font-bold font-mono ${config.insights.final >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatCurrency(config.insights.final)}
                </p>
                <p className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
                  {formatPercent(config.insights.growthPct)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
