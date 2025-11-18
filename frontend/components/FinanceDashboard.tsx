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
import { motion } from "framer-motion"

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

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
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
  const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "#f3f4f6"
  const textColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#6b7280"
  const tooltipBg = isDark ? "rgba(30, 30, 35, 0.98)" : "rgba(255, 255, 255, 0.98)"
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
  const tooltipText = isDark ? "rgba(255, 255, 255, 0.95)" : "#1f2937"
  
  // Custom Tooltip Component with highlighted numbers
  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (!active || !payload || !Array.isArray(payload) || payload.length === 0) return null

    // Фильтруем только валидные значения - всегда показываем все доступные данные
    const displayPayload = payload.filter((entry: any) => {
      if (!entry) return false
      const value = entry.value
      // Проверяем, что значение существует и является числом
      return value != null && value !== undefined && value !== "" && !isNaN(Number(value))
    })
    
    // Если после фильтрации нет данных, все равно показываем исходные данные
    const finalPayload = displayPayload.length > 0 ? displayPayload : payload.filter((entry: any) => entry && entry.value != null)
    
    if (finalPayload.length === 0) return null

    // Создаем уникальный key для tooltip на основе label и данных
    const tooltipKey = `${label}-${finalPayload.map((e: any) => `${e.name}-${e.value}`).join('-')}`

    return (
      <motion.div
        key={tooltipKey}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="rounded-2xl border backdrop-blur-xl shadow-2xl p-3"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          boxShadow: isDark 
            ? "0 20px 40px rgba(0, 0, 0, 0.5)" 
            : "0 20px 40px rgba(0, 0, 0, 0.15)"
        }}
      >
        <p className="text-xs font-semibold mb-2 text-finsim-textMain dark:text-finsim-dark-textMain">
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
                  // Если formatter вернул null, используем стандартное форматирование
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
              // В случае ошибки используем стандартное форматирование
              displayValue = currencyDE.format(Number(entry.value))
            }
            
            // Определяем цвет для подчеркивания на основе имени
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
                    className="w-2.5 h-2.5 rounded-full shadow-sm" 
                    style={{ backgroundColor: entry.color }}
                  />
                )}
                <span className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                  {displayName}:
                </span>
                <span 
                  className="text-xs font-bold font-mono"
                  style={{ 
                    color: accentColor,
                    textShadow: isDark 
                      ? `0 0 8px ${accentColor}40` 
                      : `0 0 4px ${accentColor}20`
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
        // getDay() returns 0 (Sunday) to 6 (Saturday), convert to 0 (Monday) to 6 (Sunday)
        let dayOfWeek = date.getDay()
        dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert Sunday (0) to 6, others shift by -1
        
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

    return {
      monthlyData,
      categoryData,
      weekdayData,
      cashFlowData,
    }
  }, [transactions])

  if (transactions.length === 0) {
    return (
      <div className="bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-border dark:border-finsim-dark-border rounded-xl p-8 text-center">
        <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
          Lade zuerst deine Finanzdaten hoch, um das Dashboard zu sehen.
        </p>
      </div>
    )
  }

  return (
    <section className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-8 animate-fade-in-up">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Finanz-Dashboard</h3>
        <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">Detaillierte Analyse deiner Transaktionen</p>
      </div>
      
      <div className="space-y-6">
        {/* First Row: Monthly Income/Expense and Weekday Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Income/Expense Chart */}
          <div className="glass-effect premium-shadow rounded-xl p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Monatliche Einnahmen & Ausgaben</h4>
            <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">Übersicht nach Monaten</p>
          </div>
            <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData.monthlyData}
                onMouseLeave={() => setActiveBar(null)}
                margin={{ top: 10, right: 16, left: 56, bottom: 24 }}
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
                <Tooltip 
                  content={<CustomTooltip formatter={(value: number, name: string) => {
                    // Всегда показываем данные, но фильтруем только визуально через opacity
                    return [currencyDE.format(Number(value)), name]
                  }} />}
                />
                <Legend 
                  wrapperStyle={{ 
                    fontSize: '11px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 500,
                    color: textColor
                  }}
                  iconType="circle"
                  formatter={(value: string) => {
                    const color = value === "Einnahmen" 
                      ? (isDark ? "#34d399" : "#10b981")
                      : (isDark ? "#f87171" : "#ef4444")
                    return (
                      <span style={{ color }} className="font-medium">
                        {value}
                      </span>
                    )
                  }}
                />
                <Bar 
                  dataKey="Einnahmen" 
                  fill={isDark ? "#34d399" : "#10b981"} 
                  radius={[6, 6, 0, 0]}
                  opacity={activeBar === null || activeBar === "Einnahmen" ? 1 : 0.5}
                  onMouseEnter={() => setActiveBar("Einnahmen")}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                  style={{ 
                    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
                    cursor: 'pointer',
                    filter: activeBar === "Einnahmen" ? 'brightness(1.2) drop-shadow(0 4px 12px rgba(16, 185, 129, 0.4))' : 'none'
                  }}
                />
                <Bar 
                  dataKey="Ausgaben" 
                  fill={isDark ? "#f87171" : "#ef4444"} 
                  radius={[6, 6, 0, 0]}
                  opacity={activeBar === null || activeBar === "Ausgaben" ? 1 : 0.5}
                  onMouseEnter={() => setActiveBar("Ausgaben")}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                  style={{ 
                    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
                    cursor: 'pointer',
                    filter: activeBar === "Ausgaben" ? 'brightness(1.2) drop-shadow(0 4px 12px rgba(239, 68, 68, 0.4))' : 'none'
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

          {/* Weekday Distribution */}
          <div className="glass-effect premium-shadow rounded-xl p-5 space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Ausgaben nach Wochentag</h4>
              <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">Verteilung über die Woche</p>
            </div>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData.weekdayData}
                  onMouseLeave={() => setActiveWeekday(null)}
                  margin={{ top: 10, right: 16, left: 56, bottom: 24 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={gridColor} 
                    opacity={isDark ? 0.2 : 0.4}
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
                  <Tooltip 
                    content={<CustomTooltip formatter={(value: number, name: string) => {
                      return [currencyDE.format(Number(value)), name || "Ausgaben"]
                    }} />}
                    labelFormatter={(label: string) => `Tag: ${label}`}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill={isDark ? "#60a5fa" : "#3b82f6"} 
                    fillOpacity={0.8}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-in-out"
                  >
                    {chartData.weekdayData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={isDark ? "#60a5fa" : "#3b82f6"}
                        fillOpacity={activeWeekday === null || activeWeekday === index ? 0.9 : 0.5}
                        style={{ 
                          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
                          cursor: 'pointer',
                          filter: activeWeekday === index ? 'brightness(1.2) drop-shadow(0 4px 12px rgba(59, 130, 246, 0.4))' : 'none'
                        }}
                        onMouseEnter={() => setActiveWeekday(index)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Second Row: Category Pie Chart - Full Width */}
        <div className="glass-effect premium-shadow rounded-xl p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Ausgaben nach Kategorien</h4>
            <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
              Verteilung deiner Ausgaben
            </p>
          </div>
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-8">
            {/* Donut Chart */}
            <div className="h-[280px] sm:h-[320px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseLeave={() => setActivePieIndex(null)}>
                <Pie
                  data={chartData.categoryData}
                  cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                  labelLine={false}
                  label={false}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                >
                  {chartData.categoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={chartColors[index % chartColors.length]}
                        opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.25}
                      onMouseEnter={() => setActivePieIndex(index)}
                        style={{ 
                          transition: 'opacity 0.3s ease, transform 0.2s ease',
                          cursor: 'pointer',
                          filter: activePieIndex === index ? 'brightness(1.1)' : 'none'
                        }}
                    />
                  ))}
                </Pie>
                <Tooltip
                    content={<CustomTooltip formatter={(value: number, name: string) => {
                      // Всегда показываем данные
                    const key = (name || '').toString().toLowerCase()
                      const label = capitalizeCategory(CATEGORY_LABELS[key] || name)
                      return [currencyDE.format(Number(value)), label]
                    }} />}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

            {/* Top Categories List */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wider mb-3">
                Top Kategorien
              </p>
              <div className="space-y-2.5 max-h-[280px] sm:max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {chartData.categoryData && chartData.categoryData.length > 0 ? (
                  chartData.categoryData.slice(0, 5).map((category, index) => {
                  const total = chartData.categoryData.reduce((sum, item) => sum + item.value, 0)
                  const percent = (category.value / total) * 100
                  const key = (category.name || '').toString().toLowerCase()
                  const label = capitalizeCategory(CATEGORY_LABELS[key] || category.name)
                  const isActive = activePieIndex === index
                  const categoryColor = chartColors[index % chartColors.length]
                  
                  return (
                    <motion.div
                      key={category.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`group relative p-3.5 rounded-lg bg-white/60 dark:bg-white/5 border border-finsim-borderLight dark:border-finsim-dark-borderLight transition-all duration-300 cursor-pointer ${
                        isActive
                          ? "bg-finsim-primary/10 dark:bg-finsim-dark-primary/15 border-finsim-primary/30 dark:border-finsim-dark-primary/40 shadow-sm scale-[1.01]"
                          : "hover:bg-white/80 dark:hover:bg-white/10 hover:border-finsim-primary/20 dark:hover:border-finsim-dark-primary/30"
                      }`}
                      onMouseEnter={() => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 shadow-sm"
                            style={{ 
                              backgroundColor: categoryColor,
                              transform: isActive ? 'scale(1.15)' : 'scale(1)',
                            }}
                          />
                          <span className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain truncate">
                            {label}
                          </span>
          </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span 
                            className="text-xs font-bold font-mono"
                            style={{ 
                              color: categoryColor,
                              textShadow: isActive 
                                ? (isDark ? `0 0 6px ${categoryColor}50` : `0 0 3px ${categoryColor}30`)
                                : 'none'
                            }}
                          >
                            {percent.toFixed(1)}%
                          </span>
                          <span 
                            className="text-xs font-bold font-mono"
                            style={{ 
                              color: categoryColor,
                              textShadow: isActive 
                                ? (isDark ? `0 0 6px ${categoryColor}50` : `0 0 3px ${categoryColor}30`)
                                : 'none'
                            }}
                          >
                            {currencyDE.format(category.value)}
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-finsim-surfaceMuted dark:bg-finsim-dark-surfaceMuted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ delay: index * 0.05 + 0.2, duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            backgroundColor: categoryColor,
                          }}
                        />
                      </div>
                    </motion.div>
                  )
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                      Keine Kategoriedaten verfügbar
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Third Row: Cash-Flow Line Chart - Full Width */}
        <div className="glass-effect premium-shadow rounded-xl p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Cash-Flow Entwicklung</h4>
            <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">Kumulativer Kontostand über Zeit</p>
          </div>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData.cashFlowData}
                onMouseLeave={() => setActiveLineIndex(null)}
                margin={{ top: 10, right: 16, left: 56, bottom: 32 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={gridColor} 
                  opacity={isDark ? 0.2 : 0.4}
                />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
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
                <Tooltip 
                  content={<CustomTooltip formatter={(value: number, name: string) => {
                    return [currencyDE.format(Number(value)), name || "Kontostand"]
                  }} />}
                />
                <Legend 
                  wrapperStyle={{ 
                    fontSize: '11px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 500,
                    color: textColor
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={isDark ? "#818cf8" : "#6366f1"}
                  strokeWidth={3}
                  name="Kontostand"
                  dot={false}
                  activeDot={{ 
                    r: 8, 
                    fill: isDark ? "#818cf8" : "#6366f1",
                    stroke: isDark ? 'rgba(30, 30, 35, 1)' : '#fff',
                    strokeWidth: 3,
                    style: { 
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      filter: 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.4))'
                    }
                  }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                  style={{ 
                    cursor: 'pointer',
                    transition: 'stroke-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: activeLineIndex !== null ? 'drop-shadow(0 2px 8px rgba(99, 102, 241, 0.3))' : 'none'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  )
}

