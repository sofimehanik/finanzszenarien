"use client"

import { useMemo, useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { Transaction } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, Sparkles, Target, Zap, ChevronRight, Info } from "lucide-react"

// Helper function to capitalize first letter
const capitalizeCategory = (str: string): string => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

type FinanceDashboardProps = {
  transactions: Transaction[]
}

const COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
]

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Miete",
  groceries: "Lebensmittel",
  transport: "Transport",
  shopping: "Einkäufe",
  insurance: "Versicherung",
  leisure: "Freizeit",
  health: "Gesundheit",
  phone: "Telefon",
  fitness: "Fitness",
  subscriptions: "Abos",
  savings_emergency: "Notgroschen",
  savings_vacation: "Urlaubssparen",
  salary: "Gehalt",
}

const currencyDE = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

export function FinanceDashboard({ transactions }: FinanceDashboardProps) {
  const [activeBar, setActiveBar] = useState<string | null>(null)
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null)
  const [activeWeekday, setActiveWeekday] = useState<number | null>(null)
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)

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

  const darkColors = [
    "#60a5fa", // blue
    "#f87171", // red
    "#34d399", // green
    "#fbbf24", // amber
    "#a78bfa", // purple
    "#f472b6", // pink
    "#22d3ee", // cyan
    "#a3e635", // lime
    "#fb923c", // orange
    "#818cf8", // indigo
  ]

  const chartColors = isDark ? darkColors : COLORS
  const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"
  const textColor = isDark ? "rgba(255, 255, 255, 0.5)" : "#6b7280"
  const tooltipBg = isDark ? "rgba(20, 20, 25, 0.98)" : "rgba(255, 255, 255, 0.98)"
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
  
  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (!active || !payload || !Array.isArray(payload) || payload.length === 0) return null

    const displayPayload = payload.filter((entry: any) => {
      if (!entry) return false
      const value = entry.value
      return value != null && value !== undefined && value !== "" && !isNaN(Number(value))
    })
    
    const finalPayload = displayPayload.length > 0 ? displayPayload : payload.filter((entry: any) => entry && entry.value != null)
    
    if (finalPayload.length === 0) return null

    const tooltipKey = `${label}-${finalPayload.map((e: any) => `${e.name}-${e.value}`).join('-')}`

    return (
      <motion.div
        key={tooltipKey}
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className="rounded-xl border backdrop-blur-xl shadow-2xl p-3 min-w-[160px]"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          boxShadow: isDark 
            ? "0 20px 40px rgba(0, 0, 0, 0.6)" 
            : "0 20px 40px rgba(0, 0, 0, 0.12)"
        }}
      >
        <p className="text-[10px] font-semibold mb-2.5 text-finsim-textMain dark:text-finsim-dark-textMain opacity-80 uppercase tracking-wider">
          {label || "Daten"}
        </p>
        <div className="space-y-1.5">
          {finalPayload.map((entry: any, index: number) => {
            let displayValue: string = ""
            let displayName: string = entry.name || "Wert"
            
            try {
              if (formatter) {
                const formatted = formatter(entry.value, entry.name)
                if (formatted === null || formatted === undefined) {
                  displayValue = currencyDE.format(Number(entry.value))
                } else if (Array.isArray(formatted)) {
                  displayValue = formatted[0] || currencyDE.format(Number(entry.value))
                  displayName = formatted[1] || entry.name || "Wert"
                } else {
                  displayValue = String(formatted)
                }
              } else {
                displayValue = currencyDE.format(Number(entry.value))
              }
            } catch (e) {
              displayValue = currencyDE.format(Number(entry.value))
            }
            
            const getColorForName = (name: string) => {
              if (!name) return entry.color || (isDark ? "#818cf8" : "#6366f1")
              const nameLower = name.toLowerCase()
              if (nameLower.includes("einnahmen") || nameLower === "einnahmen") {
                return isDark ? "#34d399" : "#10b981"
              }
              if (nameLower.includes("ausgaben") || nameLower === "ausgaben") {
                return isDark ? "#f87171" : "#ef4444"
              }
              if (nameLower.includes("kontostand") || nameLower.includes("balance")) {
                return isDark ? "#818cf8" : "#6366f1"
              }
              return entry.color || (isDark ? "#818cf8" : "#6366f1")
            }
            
            const accentColor = getColorForName(displayName)
            
            return (
              <div key={index} className="flex items-center gap-2">
                {entry.color && (
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                )}
                <span className="text-[10px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary font-medium">
                  {displayName}:
                </span>
                <span 
                  className="text-xs font-bold font-mono"
                  style={{ 
                    color: accentColor,
                  }}
                >
                  {displayValue}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  const chartData = useMemo(() => {
    if (transactions.length === 0) {
      return {
        monthlyData: [],
        categoryData: [],
        weekdayData: [],
        cashFlowData: [],
        metrics: {
          totalIncome: 0,
          totalExpenses: 0,
          netBalance: 0,
          savingsRate: 0,
          avgMonthlyIncome: 0,
          avgMonthlyExpenses: 0,
          topCategory: null as { name: string; value: number } | null,
          biggestExpenseDay: null as { day: string; amount: number } | null,
        }
      }
    }

    // 1. Monthly income/expense over time
    const monthlyMap = new Map<string, { income: number; expenses: number }>()
    
    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: 0, expenses: 0 })
      }
      
      const monthData = monthlyMap.get(monthKey)!
      if (t.amount > 0) {
        monthData.income += t.amount
      } else {
        monthData.expenses += Math.abs(t.amount)
      }
    })

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        Einnahmen: data.income,
        Ausgaben: data.expenses,
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split("/").map(Number)
        const [bMonth, bYear] = b.month.split("/").map(Number)
        if (aYear !== bYear) return aYear - bYear
        return aMonth - bMonth
      })

    // 2. Category breakdown (expenses only)
    const categoryMap = new Map<string, number>()
    
    transactions.forEach((t) => {
      if (t.amount < 0) {
        const category = t.category || "Sonstiges"
        const current = categoryMap.get(category) || 0
        categoryMap.set(category, current + Math.abs(t.amount))
      }
    })

    const categoryData = Array.from(categoryMap.entries())
      .filter(([, amount]) => amount > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // 3. Weekday spending distribution
    const weekdayMap = new Map<number, number>()
    
    transactions.forEach((t) => {
      if (t.amount < 0) {
        const date = new Date(t.date)
        let dayOfWeek = date.getDay()
        dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        
        const current = weekdayMap.get(dayOfWeek) || 0
        weekdayMap.set(dayOfWeek, current + Math.abs(t.amount))
      }
    })

    const weekdayData = Array.from({ length: 7 }, (_, i) => ({
      day: WEEKDAY_LABELS[i],
      amount: weekdayMap.get(i) || 0,
    }))

    // 4. Cash-flow curve (cumulative balance)
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    let cumulativeBalance = 0
    const cashFlowData = sortedTransactions.map((t) => {
      cumulativeBalance += t.amount
      const date = new Date(t.date)
      const dateLabel = `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`
      return {
        date: dateLabel,
        balance: cumulativeBalance,
      }
    })

    // 5. Calculate metrics
    const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const netBalance = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
    
    const uniqueMonths = new Set(monthlyData.map(d => d.month)).size
    const avgMonthlyIncome = uniqueMonths > 0 ? totalIncome / uniqueMonths : 0
    const avgMonthlyExpenses = uniqueMonths > 0 ? totalExpenses / uniqueMonths : 0
    
    const topCategory = categoryData.length > 0 ? categoryData[0] : null
    const biggestExpenseDay = weekdayData.reduce((max, day) => 
      day.amount > max.amount ? day : max, 
      { day: "Mo", amount: 0 }
    )

    return {
      monthlyData,
      categoryData,
      weekdayData,
      cashFlowData,
      metrics: {
        totalIncome,
        totalExpenses,
        netBalance,
        savingsRate,
        avgMonthlyIncome,
        avgMonthlyExpenses,
        topCategory,
        biggestExpenseDay: biggestExpenseDay.amount > 0 ? biggestExpenseDay : null,
      }
    }
  }, [transactions])

  if (transactions.length === 0) {
    return (
      <div className="bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-border dark:border-finsim-dark-border rounded-2xl p-8 text-center">
        <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
          Lade zuerst deine Finanzdaten hoch, um das Dashboard zu sehen.
        </p>
      </div>
    )
  }

  const { metrics } = chartData

  // Calculate additional insights
  const insights = useMemo(() => {
    const incomeExpenseRatio = metrics.totalIncome > 0 ? (metrics.totalExpenses / metrics.totalIncome) * 100 : 0
    const monthlyGrowth = metrics.avgMonthlyIncome > 0 
      ? ((metrics.avgMonthlyIncome - metrics.avgMonthlyExpenses) / metrics.avgMonthlyIncome) * 100 
      : 0
    const transactionsCount = transactions.length
    const avgTransactionAmount = transactionsCount > 0 
      ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactionsCount 
      : 0
    
    return {
      incomeExpenseRatio,
      monthlyGrowth,
      canSaveMore: metrics.savingsRate < 20,
      isHealthy: metrics.netBalance >= 0 && metrics.savingsRate >= 10,
      transactionsCount,
      avgTransactionAmount,
    }
  }, [metrics, transactions])

  return (
    <section className="space-y-3">
      {/* Header - Minimal */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-0.5"
      >
        <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
          Finanz-Dashboard
        </h3>
        <p className="text-[11px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
          Übersicht deiner Finanzen
        </p>
      </motion.div>

      {/* Charts Section - Balanced Layout */}
      <div className="space-y-3">
        {/* First Row: Category - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-effect premium-shadow rounded-lg p-5"
        >
          <div className="space-y-0.5 mb-4">
            <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
              Ausgaben nach Kategorien
            </h4>
            <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
              Verteilung deiner Ausgaben
            </p>
          </div>
          <div className="grid grid-cols-[1fr_1.1fr] gap-5 items-center">
            {/* Donut Chart */}
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart onMouseLeave={() => setActivePieIndex(null)}>
                  <Pie
                    data={chartData.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={2}
                    labelLine={false}
                    label={false}
                    fill="#8884d8"
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {chartData.categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={chartColors[index % chartColors.length]}
                        opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.25}
                        onMouseEnter={() => setActivePieIndex(index)}
                        style={{ 
                          transition: 'opacity 0.25s ease',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip formatter={(value: number, name: string) => {
                      const key = (name || '').toString().toLowerCase()
                      const label = capitalizeCategory(CATEGORY_LABELS[key] || name)
                      return [currencyDE.format(Number(value)), label]
                    }} />}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Top Categories List - Compact */}
            <div className="space-y-2">
              {chartData.categoryData.slice(0, 5).map((category, index) => {
                const total = chartData.categoryData.reduce((sum, item) => sum + item.value, 0)
                const percent = (category.value / total) * 100
                const key = (category.name || '').toString().toLowerCase()
                const label = capitalizeCategory(CATEGORY_LABELS[key] || category.name)
                const isActive = activePieIndex === index
                const categoryColor = chartColors[index % chartColors.length]
                
                return (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + index * 0.02 }}
                    className={`group relative p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-finsim-primary/8 dark:bg-finsim-dark-primary/12 border-finsim-primary/25 dark:border-finsim-dark-primary/30"
                        : "bg-white/30 dark:bg-white/4 border-finsim-borderLight dark:border-finsim-dark-borderLight hover:bg-white/50 dark:hover:bg-white/8"
                    }`}
                    onMouseEnter={() => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(null)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200"
                          style={{ 
                            backgroundColor: categoryColor,
                            transform: isActive ? 'scale(1.3)' : 'scale(1)',
                          }}
                        />
                        <span className="text-xs font-semibold text-finsim-textMain dark:text-finsim-dark-textMain truncate">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span 
                          className="text-xs font-bold font-mono"
                          style={{ color: categoryColor }}
                        >
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1 bg-finsim-surfaceMuted dark:bg-finsim-dark-surfaceMuted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ delay: 0.4 + index * 0.02, duration: 0.5, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: categoryColor }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Second Row: Monthly Overview and Weekday - Equal Size */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Monthly Income/Expense Chart */}
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-effect premium-shadow rounded-lg p-5"
          >
            <div className="space-y-0.5 mb-4">
              <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                Monatliche Übersicht
              </h4>
              <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                Einnahmen und Ausgaben nach Monaten
              </p>
          </div>
            <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData.monthlyData}
                onMouseLeave={() => setActiveBar(null)}
                  margin={{ top: 8, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={gridColor} 
                    opacity={isDark ? 0.1 : 0.25}
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
                    tickFormatter={(value) => {
                      const kValue = value / 1000
                      return `${kValue.toFixed(0)}k`
                    }}
                  tick={{ 
                      fontSize: 10, 
                    fill: textColor,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 500
                  }}
                  tickLine={{ stroke: gridColor }}
                  axisLine={{ stroke: gridColor }}
                    width={40}
                    domain={['auto', 'auto']}
                    allowDecimals={false}
                    ticks={(() => {
                      // Calculate unique ticks to avoid duplicates
                      const allValues = chartData.monthlyData.flatMap(d => [d.Einnahmen, d.Ausgaben])
                      const maxValue = Math.max(...allValues, 0)
                      const minValue = Math.min(...allValues, 0)
                      const range = maxValue - minValue
                      const step = range > 0 ? Math.ceil(range / 4 / 1000) * 1000 : 1000
                      const ticks: number[] = []
                      for (let i = Math.floor(minValue / step) * step; i <= maxValue + step; i += step) {
                        if (i >= 0) ticks.push(i)
                      }
                      // Remove duplicates
                      return Array.from(new Set(ticks))
                    })()}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={(value: number, name: string) => {
                    return [currencyDE.format(Number(value)), name]
                  }} />}
                />
                <Bar 
                  dataKey="Einnahmen" 
                  fill={isDark ? "#34d399" : "#10b981"} 
                  radius={[5, 5, 0, 0]}
                  opacity={activeBar === null || activeBar === "Einnahmen" ? 1 : 0.35}
                  onMouseEnter={() => setActiveBar("Einnahmen")}
                  isAnimationActive={true}
                  animationDuration={700}
                  animationEasing="ease-out"
                  style={{ 
                    transition: 'opacity 0.25s ease',
                    cursor: 'pointer',
                  }}
                />
                <Bar 
                  dataKey="Ausgaben" 
                  fill={isDark ? "#f87171" : "#ef4444"} 
                  radius={[5, 5, 0, 0]}
                  opacity={activeBar === null || activeBar === "Ausgaben" ? 1 : 0.35}
                  onMouseEnter={() => setActiveBar("Ausgaben")}
                  isAnimationActive={true}
                  animationDuration={700}
                  animationEasing="ease-out"
                  style={{ 
                    transition: 'opacity 0.25s ease',
                    cursor: 'pointer',
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </motion.div>

          {/* Weekday Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-effect premium-shadow rounded-lg p-5"
          >
            <div className="space-y-0.5 mb-4">
              <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                Ausgaben nach Wochentag
              </h4>
              <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                Wann gibst du am meisten aus?
              </p>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData.weekdayData}
                  onMouseLeave={() => setActiveWeekday(null)}
                  margin={{ top: 8, right: 20, left: 0, bottom: 20 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={gridColor} 
                    opacity={isDark ? 0.1 : 0.25}
                  />
                  <XAxis 
                    dataKey="day" 
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
                    tickFormatter={(value) => {
                      const kValue = value / 1000
                      return `${kValue.toFixed(0)}k`
                    }}
                    tick={{ 
                      fontSize: 10, 
                      fill: textColor,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 500
                    }}
                    tickLine={{ stroke: gridColor }}
                    axisLine={{ stroke: gridColor }}
                    width={40}
                    domain={['auto', 'auto']}
                    allowDecimals={false}
                    ticks={(() => {
                      // Calculate unique ticks to avoid duplicates
                      const allValues = chartData.weekdayData.map(d => d.amount)
                      const maxValue = Math.max(...allValues, 0)
                      const minValue = Math.min(...allValues, 0)
                      const range = maxValue - minValue
                      const step = range > 0 ? Math.ceil(range / 4 / 1000) * 1000 : 1000
                      const ticks: number[] = []
                      for (let i = Math.floor(minValue / step) * step; i <= maxValue + step; i += step) {
                        if (i >= 0) ticks.push(i)
                      }
                      // Remove duplicates
                      return Array.from(new Set(ticks))
                    })()}
                  />
                  <Tooltip 
                    content={<CustomTooltip formatter={(value: number, name: string) => {
                      return [currencyDE.format(Number(value)), name || "Ausgaben"]
                    }} />}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill={isDark ? "#60a5fa" : "#3b82f6"} 
                    radius={[5, 5, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {chartData.weekdayData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={isDark ? "#60a5fa" : "#3b82f6"}
                        opacity={activeWeekday === null || activeWeekday === index ? 0.85 : 0.3}
                        style={{ 
                          transition: 'opacity 0.25s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={() => setActiveWeekday(index)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Third Row: Cash-Flow Line Chart - Full Width */}
                    <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-effect premium-shadow rounded-lg p-5"
        >
          <div className="space-y-0.5 mb-4">
            <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
              Cash-Flow Entwicklung
            </h4>
                    <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
              Kumulativer Kontostand über Zeit
                    </p>
                  </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData.cashFlowData}
                onMouseLeave={() => setActiveLineIndex(null)}
                margin={{ top: 8, right: 20, left: 0, bottom: 40 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={gridColor} 
                  opacity={isDark ? 0.1 : 0.25}
                />
                <XAxis 
                  dataKey="date" 
                  angle={-35}
                  textAnchor="end"
                  height={55}
                  interval="preserveStartEnd"
                  tick={{ 
                    fontSize: 10, 
                    fill: textColor,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 500
                  }}
                  tickLine={{ stroke: gridColor }}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis 
                  tickFormatter={(value) => {
                    const kValue = value / 1000
                    return `${kValue.toFixed(0)}k`
                  }}
                  tick={{ 
                    fontSize: 10, 
                    fill: textColor,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 500
                  }}
                  tickLine={{ stroke: gridColor }}
                  axisLine={{ stroke: gridColor }}
                  width={40}
                  domain={['auto', 'auto']}
                  allowDecimals={false}
                  ticks={(() => {
                    // Calculate unique ticks to avoid duplicates
                    const allValues = chartData.cashFlowData.map(d => d.balance)
                    const maxValue = Math.max(...allValues, 0)
                    const minValue = Math.min(...allValues, 0)
                    const range = maxValue - minValue
                    const step = range > 0 ? Math.ceil(range / 4 / 1000) * 1000 : 1000
                    const ticks: number[] = []
                    for (let i = Math.floor(minValue / step) * step; i <= maxValue + step; i += step) {
                      if (i >= 0) ticks.push(i)
                    }
                    // Remove duplicates
                    return Array.from(new Set(ticks))
                  })()}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={(value: number, name: string) => {
                    return [currencyDE.format(Number(value)), name || "Kontostand"]
                  }} />}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={isDark ? "#818cf8" : "#6366f1"}
                  strokeWidth={2.5}
                  name="Kontostand"
                  dot={false}
                  activeDot={{ 
                    r: 6, 
                    fill: isDark ? "#818cf8" : "#6366f1",
                    stroke: isDark ? 'rgba(20, 20, 25, 1)' : '#fff',
                    strokeWidth: 2,
                    style: { 
                      transition: 'all 0.25s ease',
                    }
                  }}
                  isAnimationActive={true}
                  animationDuration={700}
                  animationEasing="ease-out"
                  style={{ 
                    cursor: 'pointer',
                    transition: 'stroke-width 0.25s ease',
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
