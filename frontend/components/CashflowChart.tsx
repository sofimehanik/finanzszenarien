"use client"

import { useMemo, useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Transaction } from "@/lib/api"
import { motion } from "framer-motion"

interface CashflowChartProps {
  transactions: Transaction[]
}

const currencyDE = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

export function CashflowChart({ transactions }: CashflowChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()
    // Use a debounced observer to prevent excessive re-renders
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

  const cashFlowData = useMemo(() => {
    if (transactions.length === 0) return []

    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    let cumulativeBalance = 0
    const data = sortedTransactions.map((t) => {
      cumulativeBalance += t.amount
      const date = new Date(t.date)
      const dateLabel = `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`
      return {
        date: dateLabel,
        balance: cumulativeBalance,
        amount: t.amount,
      }
    })

    return data
  }, [transactions])

  const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "#f3f4f6"
  const textColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#6b7280"
  const tooltipBg = isDark ? "rgba(30, 30, 35, 0.98)" : "rgba(255, 255, 255, 0.98)"
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
  const lineColor = isDark ? "#818cf8" : "#6366f1"

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0].payload

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
        <p className="text-xs font-semibold mb-2 text-finsim-textMain dark:text-finsim-dark-textMain">
          {label}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
              Kontostand:
            </span>
            <span className="text-xs font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
              {currencyDE.format(data.balance)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
              Transaktion:
            </span>
            <span className={`text-xs font-semibold ${
              data.amount >= 0 
                ? "text-emerald-600 dark:text-emerald-400" 
                : "text-red-500 dark:text-red-400"
            }`}>
              {data.amount >= 0 ? "+" : ""}{currencyDE.format(data.amount)}
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  if (cashFlowData.length === 0) {
    return (
      <div className="bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-lg p-5 text-center">
        <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
          Keine Cash-Flow-Daten verfügbar
        </p>
      </div>
    )
  }

  return (
    <div className="bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-lg p-5 space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
          Cash-Flow Entwicklung
        </h4>
        <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
          Kumulativer Kontostand über Zeit
        </p>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={cashFlowData}
            onMouseLeave={() => setActiveIndex(null)}
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
              tick={{ fontSize: 11, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis 
              tickFormatter={(value) => currencyDE.format(Number(value))} 
              tick={{ fontSize: 11, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              axisLine={{ stroke: gridColor }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ 
                r: 6, 
                fill: lineColor,
                stroke: isDark ? 'rgba(30, 30, 35, 1)' : '#fff',
                strokeWidth: 2,
                style: { transition: 'all 0.2s ease' }
              }}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
              style={{ cursor: 'pointer' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}




