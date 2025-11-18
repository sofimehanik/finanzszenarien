"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ScenarioProjection } from "@/lib/api"

interface ScenarioChartProps {
  projections: ScenarioProjection[]
  title: string
}

export function ScenarioChart({ projections, title }: ScenarioChartProps) {
  const [activeLine, setActiveLine] = useState<string | null>(null)
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

  const chartData = projections.map((p) => ({
    month: p.month,
    Einnahmen: p.projected_income,
    Ausgaben: p.projected_expenses,
    Saldo: p.projected_balance,
    Kumuliert: p.cumulative_balance,
  }))

  const lineConfig = [
    { key: "Einnahmen", color: isDark ? "#34d399" : "#10b981", label: "Einnahmen" },
    { key: "Ausgaben", color: isDark ? "#f87171" : "#ef4444", label: "Ausgaben" },
    { key: "Saldo", color: isDark ? "#60a5fa" : "#3b82f6", label: "Saldo" },
    { key: "Kumuliert", color: isDark ? "#818cf8" : "#6366f1", label: "Kumuliert", dashed: true },
  ]

  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "#e5e7eb"
  const textColor = isDark ? "rgba(255, 255, 255, 0.65)" : "#6b7280"
  const tooltipBg = isDark ? "hsl(240, 10%, 16%)" : "#fff"
  const tooltipBorder = isDark ? "hsl(240, 10%, 22%)" : "#e5e7eb"
  const tooltipText = isDark ? "rgba(255, 255, 255, 0.98)" : "#374151"

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
        <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">{title}</h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          {lineConfig.map((config) => (
            <button
              key={config.key}
              onClick={() => setActiveLine(activeLine === config.key ? null : config.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                activeLine === config.key || activeLine === null
                  ? config.key === "Einnahmen"
                    ? isDark 
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-emerald-50 text-emerald-700"
                    : config.key === "Ausgaben"
                    ? isDark
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-red-50 text-red-700"
                    : config.key === "Saldo"
                    ? isDark
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-blue-50 text-blue-700"
                    : isDark
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "bg-indigo-50 text-indigo-700"
                  : "opacity-40 hover:opacity-60 text-finsim-textSecondary dark:text-finsim-dark-textSecondary"
              }`}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: config.color }}
              />
              <span>{config.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData}
            onMouseLeave={() => setActiveLine(null)}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={isDark ? 0.3 : 0.5} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: textColor }}
              tickLine={{ stroke: gridColor }}
              axisLine={{ stroke: gridColor }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: tooltipBg, 
                border: `1px solid ${tooltipBorder}`, 
                borderRadius: '8px',
                boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '8px 12px'
              }}
              formatter={(value: number, name: string) => {
                if (activeLine && activeLine !== name) return null
                return [`${value.toFixed(2)} €`, name]
              }}
              labelStyle={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: tooltipText,
                marginBottom: '4px'
              }}
              itemStyle={{ fontSize: '12px', padding: '2px 0', color: tooltipText }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '16px', color: textColor }}
              iconType="line"
              formatter={(value) => {
                if (activeLine && activeLine !== value) {
                  return <span style={{ opacity: 0.3, transition: 'opacity 0.2s ease', color: textColor }}>{value}</span>
                }
                return <span style={{ transition: 'opacity 0.2s ease', color: textColor }}>{value}</span>
              }}
              onClick={(data) => {
                if (activeLine === data.dataKey) {
                  setActiveLine(null)
                } else {
                  setActiveLine(data.dataKey as string)
                }
              }}
              style={{ cursor: 'pointer' }}
            />
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
                  r: 5, 
                  fill: config.color,
                  stroke: isDark ? 'hsl(240, 10%, 13%)' : '#fff',
                  strokeWidth: 2,
                  style: { transition: 'all 0.2s ease' }
                }}
                opacity={activeLine === null || activeLine === config.key ? 1 : 0.4}
                onMouseEnter={() => setActiveLine(config.key)}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-out"
                style={{ transition: 'opacity 0.2s ease, stroke-width 0.2s ease' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

