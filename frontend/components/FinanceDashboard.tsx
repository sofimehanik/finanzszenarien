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
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "#e5e7eb"
  const textColor = isDark ? "rgba(255, 255, 255, 0.65)" : "#6b7280"
  const tooltipBg = isDark ? "hsl(240, 10%, 16%)" : "#fff"
  const tooltipBorder = isDark ? "hsl(240, 10%, 22%)" : "#e5e7eb"
  const tooltipText = isDark ? "rgba(255, 255, 255, 0.98)" : "#374151"

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
    <section className="bg-finsim-surface dark:bg-finsim-dark-surface border border-finsim-border dark:border-finsim-dark-border rounded-xl p-6 sm:p-8 space-y-8">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Finanz-Dashboard</h3>
        <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">Detaillierte Analyse deiner Transaktionen</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Income/Expense Chart */}
        <div className="bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-lg p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Monatliche Einnahmen & Ausgaben</h4>
            <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">Übersicht nach Monaten</p>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData.monthlyData}
                onMouseLeave={() => setActiveBar(null)}
                margin={{ top: 10, right: 16, left: 56, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={isDark ? 0.3 : 1} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: textColor }} />
                <YAxis tickFormatter={(value) => currencyDE.format(Number(value))} tick={{ fontSize: 12, fill: textColor }} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (activeBar && activeBar !== name) return null
                    return [currencyDE.format(Number(value)), name]
                  }}
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar 
                  dataKey="Einnahmen" 
                  fill={isDark ? "#34d399" : "#10b981"} 
                  radius={[4, 4, 0, 0]}
                  opacity={activeBar === null || activeBar === "Einnahmen" ? 1 : 0.3}
                  onMouseEnter={() => setActiveBar("Einnahmen")}
                  isAnimationActive={true}
                  animationDuration={400}
                  animationEasing="ease-out"
                  style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                />
                <Bar 
                  dataKey="Ausgaben" 
                  fill={isDark ? "#f87171" : "#ef4444"} 
                  radius={[4, 4, 0, 0]}
                  opacity={activeBar === null || activeBar === "Ausgaben" ? 1 : 0.3}
                  onMouseEnter={() => setActiveBar("Ausgaben")}
                  isAnimationActive={true}
                  animationDuration={400}
                  animationEasing="ease-out"
                  style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-lg p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Ausgaben nach Kategorien</h4>
            <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
              Verteilung der Ausgaben – Details siehst du im Tooltip und in der Legende.
            </p>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseLeave={() => setActivePieIndex(null)}>
                <Pie
                  data={chartData.categoryData}
                  cx="50%"
                  cy="45%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  labelLine={false}
                  label={false}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={400}
                  animationEasing="ease-out"
                >
                  {chartData.categoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={chartColors[index % chartColors.length]}
                      opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.3}
                      onMouseEnter={() => setActivePieIndex(index)}
                      style={{ transition: 'opacity 0.2s ease' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => {
                    if (activePieIndex !== null) {
                      const index = chartData.categoryData.findIndex(d => d.name === name)
                      if (index !== activePieIndex) return null
                    }
                    const key = (name || '').toString().toLowerCase()
                    const label = CATEGORY_LABELS[key] || name
                    return [`${currencyDE.format(Number(value))}`, label]
                  }}
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: textColor }}
                  layout="horizontal"
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value: string) => {
                    const key = (value || '').toString().toLowerCase()
                    return CATEGORY_LABELS[key] || value
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekday Distribution */}
        <div className="bg-finsim-surfaceElevated border border-finsim-borderLight rounded-lg p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-finsim-textMain tracking-tight">Ausgaben nach Wochentag</h4>
            <p className="text-xs text-finsim-textSecondary leading-relaxed">Verteilung über die Woche</p>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData.weekdayData}
                onMouseLeave={() => setActiveWeekday(null)}
                margin={{ top: 10, right: 16, left: 56, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={isDark ? 0.3 : 1} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: textColor }} />
                <YAxis tickFormatter={(value) => currencyDE.format(Number(value))} tick={{ fontSize: 12, fill: textColor }} />
                <Tooltip 
                  formatter={(value: number) => currencyDE.format(Number(value))}
                  labelFormatter={(label: string) => `Tag: ${label}`}
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Bar 
                  dataKey="amount" 
                  fill={isDark ? "#60a5fa" : "#3b82f6"} 
                  fillOpacity={0.7}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={400}
                  animationEasing="ease-out"
                >
                  {chartData.weekdayData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={isDark ? "#60a5fa" : "#3b82f6"}
                      fillOpacity={activeWeekday === null || activeWeekday === index ? 0.7 : 0.2}
                      style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                      onMouseEnter={() => setActiveWeekday(index)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash-Flow Line Chart */}
        <div className="bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-lg p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Cash-Flow Entwicklung</h4>
            <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">Kumulativer Kontostand über Zeit</p>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData.cashFlowData}
                onMouseLeave={() => setActiveLineIndex(null)}
                margin={{ top: 10, right: 16, left: 56, bottom: 32 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={isDark ? 0.3 : 1} />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11, fill: textColor }}
                />
                <YAxis tickFormatter={(value) => currencyDE.format(Number(value))} tick={{ fontSize: 12, fill: textColor }} />
                <Tooltip 
                  formatter={(value: number) => currencyDE.format(Number(value))}
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: textColor }} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={isDark ? "#818cf8" : "#6366f1"}
                  strokeWidth={2}
                  name="Kontostand"
                  dot={false}
                  activeDot={{ 
                    r: 6, 
                    fill: isDark ? "#818cf8" : "#6366f1",
                    stroke: isDark ? 'hsl(240, 10%, 13%)' : '#fff',
                    strokeWidth: 2,
                    style: { transition: 'all 0.2s ease' }
                  }}
                  isAnimationActive={true}
                  animationDuration={400}
                  animationEasing="ease-out"
                  style={{ cursor: 'pointer' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  )
}

