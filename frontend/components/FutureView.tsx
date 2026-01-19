"use client"

import { useMemo, useState, useEffect } from "react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"
import { ScenarioProjection } from "@/lib/api"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Wallet, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Eye, EyeOff } from "lucide-react"

interface FutureViewProps {
  bestCase: ScenarioProjection[]
  realisticCase: ScenarioProjection[]
  worstCase: ScenarioProjection[]
  financeData?: {
    net_balance: number
    monthly_averages: {
      income: number
      expenses: number
    }
  }
  monthsAhead?: number
}

type ScenarioType = "best" | "realistic" | "worst"

export function FutureView({ 
  bestCase, 
  realisticCase, 
  worstCase,
  financeData,
  monthsAhead = 12
}: FutureViewProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioType>("realistic")
  const [isDark, setIsDark] = useState(false)
  const [viewMode, setViewMode] = useState<"combined" | "separate">("combined")

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()
    const observer = new MutationObserver(() => {
      setTimeout(checkTheme, 50)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Get current scenario projections
  const currentProjections = useMemo(() => {
    let projections: ScenarioProjection[] = []
    if (activeScenario === "best") projections = bestCase
    else if (activeScenario === "realistic") projections = realisticCase
    else projections = worstCase
    
    if (monthsAhead && projections.length > monthsAhead) {
      return projections.slice(0, monthsAhead)
    }
    return projections
  }, [activeScenario, bestCase, realisticCase, worstCase, monthsAhead])

  // Prepare chart data with future income, expenses, and bank balance
  const chartData = useMemo(() => {
    if (!currentProjections || currentProjections.length === 0) return []
    
    const initialBalance = financeData?.net_balance ?? 0
    
    return currentProjections.map((p, index) => {
      const projectedIncome = Number(p.projected_income ?? 0) || 0
      const projectedExpenses = Number(Math.abs(p.projected_expenses ?? 0)) || 0
      const accountBalance = initialBalance + Number(p.cumulative_balance ?? 0)
      
      return {
        month: p.month,
        monthLabel: new Date(p.month + '-01').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
        Einnahmen: projectedIncome,
        Ausgaben: projectedExpenses,
        Kontostand: accountBalance,
        Saldo: Number(p.projected_balance ?? 0) || 0,
      }
    })
  }, [currentProjections, financeData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const scenarioConfig = {
    best: {
      label: "Best Case",
      color: isDark ? "#34d399" : "#10b981",
      bgColor: isDark ? "rgba(52, 211, 153, 0.1)" : "rgba(16, 185, 129, 0.08)",
      borderColor: isDark ? "rgba(52, 211, 153, 0.3)" : "rgba(16, 185, 129, 0.25)",
    },
    realistic: {
      label: "Realistisch",
      color: isDark ? "#60a5fa" : "#3b82f6",
      bgColor: isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(59, 130, 246, 0.08)",
      borderColor: isDark ? "rgba(96, 165, 250, 0.3)" : "rgba(59, 130, 246, 0.25)",
    },
    worst: {
      label: "Worst Case",
      color: isDark ? "#f87171" : "#ef4444",
      bgColor: isDark ? "rgba(248, 113, 113, 0.1)" : "rgba(239, 68, 68, 0.08)",
      borderColor: isDark ? "rgba(248, 113, 113, 0.3)" : "rgba(239, 68, 68, 0.25)",
    }
  }

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (chartData.length === 0) return null
    
    const totalIncome = chartData.reduce((sum, d) => sum + d.Einnahmen, 0)
    const totalExpenses = chartData.reduce((sum, d) => sum + d.Ausgaben, 0)
    const avgIncome = totalIncome / chartData.length
    const avgExpenses = totalExpenses / chartData.length
    const finalBalance = chartData[chartData.length - 1]?.Kontostand ?? 0
    const initialBalance = chartData[0]?.Kontostand ?? 0
    const balanceChange = finalBalance - initialBalance
    
    return {
      totalIncome,
      totalExpenses,
      avgIncome,
      avgExpenses,
      finalBalance,
      initialBalance,
      balanceChange,
      netSavings: totalIncome - totalExpenses
    }
  }, [chartData])

  const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "#f3f4f6"
  const textColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#6b7280"
  const tooltipBg = isDark ? "rgba(30, 30, 35, 0.98)" : "rgba(255, 255, 255, 0.98)"
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border backdrop-blur-xl shadow-xl p-3 min-w-[200px]"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
        }}
      >
        <p className="text-xs font-semibold mb-2 text-finsim-textMain dark:text-finsim-dark-textMain border-b border-finsim-borderLight dark:border-finsim-dark-borderLight pb-2">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            const colors: Record<string, string> = {
              Einnahmen: isDark ? "#34d399" : "#10b981",
              Ausgaben: isDark ? "#f87171" : "#ef4444",
              Kontostand: isDark ? "#818cf8" : "#6366f1",
              Saldo: isDark ? "#60a5fa" : "#3b82f6",
            }
            const labels: Record<string, string> = {
              Einnahmen: "Einnahmen",
              Ausgaben: "Ausgaben",
              Kontostand: "Kontostand",
              Saldo: "Monatssaldo",
            }
            
            return (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors[entry.dataKey] || entry.color }}
                  />
                  <span className="text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                    {labels[entry.dataKey] || entry.dataKey}:
                  </span>
                </div>
                <span 
                  className="text-xs font-bold font-mono"
                  style={{ color: colors[entry.dataKey] || entry.color }}
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

  if (chartData.length === 0) {
    return (
      <div className="w-full p-8 text-center text-finsim-textMuted dark:text-finsim-dark-textMuted">
        Keine Daten verfügbar
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-finsim-textMain dark:text-finsim-dark-textMain">
            Zukunftsvorschau
          </h3>
          <p className="text-sm text-finsim-textMuted dark:text-finsim-dark-textMuted">
            Prognose für Einnahmen, Ausgaben und Kontostand
          </p>
        </div>
        
        {/* Scenario selector */}
        <div className="flex items-center gap-2">
          {(['best', 'realistic', 'worst'] as ScenarioType[]).map((scenario) => {
            const config = scenarioConfig[scenario]
            const isActive = activeScenario === scenario
            return (
              <motion.button
                key={scenario}
                onClick={() => setActiveScenario(scenario)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "text-white shadow-md"
                    : "text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-finsim-textMain dark:hover:text-finsim-dark-textMain hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted"
                }`}
                style={isActive ? {
                  backgroundColor: config.color,
                } : {}}
              >
                {config.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border-finsim-borderLight dark:border-finsim-dark-borderLight"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted">
                Ø Einnahmen
              </span>
            </div>
            <p className="text-lg font-bold text-finsim-textMain dark:text-finsim-dark-textMain">
              {formatCurrency(summary.avgIncome)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl border bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border-finsim-borderLight dark:border-finsim-dark-borderLight"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted">
                Ø Ausgaben
              </span>
            </div>
            <p className="text-lg font-bold text-finsim-textMain dark:text-finsim-dark-textMain">
              {formatCurrency(summary.avgExpenses)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl border bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border-finsim-borderLight dark:border-finsim-dark-borderLight"
          >
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted">
                Endkontostand
              </span>
            </div>
            <p className="text-lg font-bold text-finsim-textMain dark:text-finsim-dark-textMain">
              {formatCurrency(summary.finalBalance)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-4 rounded-xl border bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border-finsim-borderLight dark:border-finsim-dark-borderLight ${
              summary.balanceChange >= 0 ? 'border-green-500/30' : 'border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {summary.balanceChange >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted">
                Veränderung
              </span>
            </div>
            <p className={`text-lg font-bold ${
              summary.balanceChange >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {summary.balanceChange >= 0 ? '+' : ''}{formatCurrency(summary.balanceChange)}
            </p>
          </motion.div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setViewMode(viewMode === "combined" ? "separate" : "combined")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-finsim-textMain dark:hover:text-finsim-dark-textMain hover:bg-finsim-surfaceMuted dark:hover:bg-finsim-dark-surfaceMuted transition-colors"
        >
          {viewMode === "combined" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {viewMode === "combined" ? "Getrennt anzeigen" : "Kombiniert anzeigen"}
        </button>
      </div>

      {/* Charts */}
      {viewMode === "combined" ? (
        // Combined view: All data in one chart
        <div className="space-y-6">
          {/* Income and Expenses Chart */}
          <div className="p-6 rounded-xl border bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <h4 className="text-sm font-semibold mb-4 text-finsim-textMain dark:text-finsim-dark-textMain">
              Einnahmen & Ausgaben
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? "#f87171" : "#ef4444"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={isDark ? "#f87171" : "#ef4444"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="monthLabel" 
                  stroke={textColor}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke={textColor}
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="Einnahmen" 
                  stroke={isDark ? "#34d399" : "#10b981"} 
                  fillOpacity={1} 
                  fill="url(#colorIncome)"
                  name="Einnahmen"
                />
                <Area 
                  type="monotone" 
                  dataKey="Ausgaben" 
                  stroke={isDark ? "#f87171" : "#ef4444"} 
                  fillOpacity={1} 
                  fill="url(#colorExpenses)"
                  name="Ausgaben"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bank Balance Chart */}
          <div className="p-6 rounded-xl border bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <h4 className="text-sm font-semibold mb-4 text-finsim-textMain dark:text-finsim-dark-textMain">
              Kontostand Entwicklung
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="monthLabel" 
                  stroke={textColor}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke={textColor}
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Kontostand" 
                  stroke={isDark ? "#818cf8" : "#6366f1"} 
                  strokeWidth={3}
                  dot={{ fill: isDark ? "#818cf8" : "#6366f1", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Kontostand"
                />
                <Line 
                  type="monotone" 
                  dataKey="Saldo" 
                  stroke={isDark ? "#60a5fa" : "#3b82f6"} 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Monatssaldo"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        // Separate view: Three separate charts
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Future Income */}
          <div className="p-6 rounded-xl border bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
                Zukünftige Einnahmen
              </h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="monthLabel" 
                  stroke={textColor}
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke={textColor}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="Einnahmen" 
                  fill={isDark ? "#34d399" : "#10b981"}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Future Expenses */}
          <div className="p-6 rounded-xl border bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
                Zukünftige Ausgaben
              </h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="monthLabel" 
                  stroke={textColor}
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke={textColor}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="Ausgaben" 
                  fill={isDark ? "#f87171" : "#ef4444"}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bank Balance */}
          <div className="p-6 rounded-xl border bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-blue-500" />
              <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
                Kontostand
              </h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="monthLabel" 
                  stroke={textColor}
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke={textColor}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="Kontostand" 
                  stroke={isDark ? "#818cf8" : "#6366f1"} 
                  strokeWidth={3}
                  dot={{ fill: isDark ? "#818cf8" : "#6366f1", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
