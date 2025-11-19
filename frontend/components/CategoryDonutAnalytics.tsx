"use client"

import { useMemo, useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Transaction } from "@/lib/api"
import { motion } from "framer-motion"

interface CategoryDonutAnalyticsProps {
  transactions: Transaction[]
}

// Modern pastel colors in Apple/Monobank style
const COLORS = [
  "#60A5FA", // soft blue
  "#F87171", // soft red
  "#34D399", // soft green
  "#FBBF24", // soft amber
  "#A78BFA", // soft purple
  "#F472B6", // soft pink
  "#22D3EE", // soft cyan
  "#A3E635", // soft lime
  "#FB923C", // soft orange
  "#818CF8", // soft indigo
  "#94A3B8", // soft slate
  "#FCD34D", // soft yellow
]

// Helper function to capitalize first letter
const capitalize = (str: string): string => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

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
  miete: "Miete",
  lebensmittel: "Lebensmittel",
  einkauf: "Einkäufe",
  telefon: "Telefon",
  freizeit: "Freizeit",
  gesundheit: "Gesundheit",
  ersparnisse_notfall: "Notgroschen",
  ersparnisse_urlaub: "Urlaubssparen",
  sparen_notgroschen: "Notgroschen",
  sparen_urlaub: "Urlaubssparen",
  öpnv: "ÖPNV",
  handy: "Handy",
  kaffee: "Kaffee",
  abos: "Abos",
}

const currencyDE = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

export function CategoryDonutAnalytics({ transactions }: CategoryDonutAnalyticsProps) {
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "6M" | "12M">("12M")

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Dark mode colors - slightly brighter for better visibility
  const darkColors = [
    "#60A5FA", // blue
    "#F87171", // red
    "#34D399", // green
    "#FBBF24", // amber
    "#A78BFA", // purple
    "#F472B6", // pink
    "#22D3EE", // cyan
    "#A3E635", // lime
    "#FB923C", // orange
    "#818CF8", // indigo
    "#94A3B8", // slate
    "#FCD34D", // yellow
  ]

  const chartColors = isDark ? darkColors : COLORS
  const tooltipBg = isDark ? "rgba(30, 30, 35, 0.98)" : "rgba(255, 255, 255, 0.98)"
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
  const textColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#6b7280"
  
  // Custom Tooltip with highlighted numbers
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const entry = payload[0]
    const label = capitalize(CATEGORY_LABELS[entry.name?.toLowerCase()] || entry.name)
    const value = currencyDE.format(Number(entry.value))

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border backdrop-blur-xl shadow-2xl p-3"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          boxShadow: isDark 
            ? "0 20px 40px rgba(0, 0, 0, 0.5)" 
            : "0 20px 40px rgba(0, 0, 0, 0.15)"
        }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.payload.fill }}
          />
          <span className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
            {label}:
          </span>
          <span className="text-xs font-bold font-mono text-finsim-textMain dark:text-finsim-dark-textMain">
            {value}
          </span>
        </div>
      </motion.div>
    )
  }

  const { categoryData, topCategories, availableTimeRanges } = useMemo(() => {
    if (transactions.length === 0) {
      return { categoryData: [], topCategories: [], availableTimeRanges: [] as Array<"1M" | "3M" | "6M" | "12M"> }
    }

    const now = new Date()
    const availableRanges: Array<"1M" | "3M" | "6M" | "12M"> = []

    // Check which time ranges have data
    const timeRangesToCheck: Array<{ range: "1M" | "3M" | "6M" | "12M", months: number }> = [
      { range: "1M", months: 1 },
      { range: "3M", months: 3 },
      { range: "6M", months: 6 },
      { range: "12M", months: 12 }
    ]

    timeRangesToCheck.forEach(({ range, months }) => {
      const cutoffDate = new Date()
      cutoffDate.setMonth(now.getMonth() - months)
      
      const hasData = transactions.some(t => {
        const date = new Date(t.date)
        return date >= cutoffDate && t.amount < 0
      })

      if (hasData) {
        availableRanges.push(range)
      }
    })

    // If only one range has data, don't show filters
    // If multiple ranges have data, show filters
    if (availableRanges.length <= 1) {
      // Use default (12M) or the only available range
      const defaultRange = availableRanges[0] || "12M"
      
      // Get data for default range
      const cutoffDate = new Date()
      cutoffDate.setMonth(now.getMonth() - (defaultRange === "1M" ? 1 : defaultRange === "3M" ? 3 : defaultRange === "6M" ? 6 : 12))

      const filteredTransactions = transactions.filter(t => {
        const date = new Date(t.date)
        return date >= cutoffDate && t.amount < 0
      })

      const categoryMap = new Map<string, number>()
      filteredTransactions.forEach((t) => {
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

      const total = categoryData.reduce((sum, item) => sum + item.value, 0)

      const topCategories = categoryData.map(item => ({
        ...item,
        percent: (item.value / total) * 100,
        label: capitalize(CATEGORY_LABELS[item.name.toLowerCase()] || item.name)
      }))

      return { categoryData, topCategories, availableTimeRanges: [] as Array<"1M" | "3M" | "6M" | "12M"> }
    }

    // Multiple ranges available - use selected timeRange
    const cutoffDate = new Date()
    switch (timeRange) {
      case "1M":
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case "3M":
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case "6M":
        cutoffDate.setMonth(now.getMonth() - 6)
        break
      case "12M":
        cutoffDate.setMonth(now.getMonth() - 12)
        break
    }

    const filteredTransactions = transactions.filter(t => {
      const date = new Date(t.date)
      return date >= cutoffDate && t.amount < 0
    })

    // Category breakdown (expenses only)
    const categoryMap = new Map<string, number>()
    filteredTransactions.forEach((t) => {
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

    const total = categoryData.reduce((sum, item) => sum + item.value, 0)

    const topCategories = categoryData.map(item => ({
      ...item,
      percent: (item.value / total) * 100,
      label: capitalize(CATEGORY_LABELS[item.name.toLowerCase()] || item.name)
    }))

    return { categoryData, topCategories, availableTimeRanges: availableRanges }
  }, [transactions, timeRange])

  const total = categoryData.reduce((sum, item) => sum + item.value, 0)

  if (categoryData.length === 0) {
    return (
      <div className="glass-effect premium-shadow rounded-[24px] p-6 text-center">
        <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
          Keine Kategoriedaten verfügbar
        </p>
      </div>
    )
  }

  // Prepare top categories (top 5) with labels for legend
  const topCategoriesList = categoryData.slice(0, 5).map((item, index) => ({
    ...item,
    percent: (item.value / total) * 100,
    label: capitalize(CATEGORY_LABELS[item.name.toLowerCase()] || item.name),
    color: chartColors[index % chartColors.length],
    index
  }))

  return (
    <div className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
            Ausgaben nach Kategorien
          </h4>
          <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
            Verteilung deiner Ausgaben
          </p>
        </div>
        
        {/* Time Range Filter - Only show if multiple ranges have data */}
        {availableTimeRanges.length > 1 && (
          <div className="flex items-center gap-1 bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-lg p-0.5">
            {availableTimeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                  timeRange === range
                    ? "bg-finsim-primary dark:bg-finsim-dark-primary text-white"
                    : "text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
        {/* Donut Chart */}
        <div className="h-[280px] sm:h-[320px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart onMouseLeave={() => setActivePieIndex(null)}>
              <Pie
                data={categoryData}
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
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {categoryData.map((entry, index) => (
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
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Categories Legend - Matching Screenshot Style */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wider mb-4">
            Top Kategorien
          </p>
          <div className="space-y-2.5">
            {topCategoriesList.map((category, index) => {
              const isActive = activePieIndex === category.index
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
                  onMouseEnter={() => setActivePieIndex(category.index)}
              onMouseLeave={() => setActivePieIndex(null)}
            >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div 
                        className="w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 shadow-sm"
                        style={{ 
                          backgroundColor: category.color,
                          transform: isActive ? 'scale(1.15)' : 'scale(1)',
                        }}
                  />
                      <span className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain truncate">
                    {category.label}
                  </span>
                </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-bold font-mono text-finsim-textMain dark:text-finsim-dark-textMain">
                  {category.percent.toFixed(1)}%
                </span>
                      <span className="text-xs font-bold font-mono text-finsim-textMain dark:text-finsim-dark-textMain">
                  {currencyDE.format(category.value)}
                </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-finsim-surfaceMuted dark:bg-finsim-dark-surfaceMuted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${category.percent}%` }}
                      transition={{ delay: index * 0.05 + 0.2, duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: category.color,
                      }}
                  />
                </div>
                </motion.div>
              )
            })}
              </div>
        </div>
      </div>
    </div>
  )
}

