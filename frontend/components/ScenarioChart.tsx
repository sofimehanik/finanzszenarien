"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts"
import { ScenarioProjection } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { Maximize2, Minimize2, X } from "lucide-react"

interface ScenarioChartProps {
  projections: ScenarioProjection[]
  title: string
}

export function ScenarioChart({ projections, title }: ScenarioChartProps) {
  const [activeLine, setActiveLine] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isFullscreen])

  const chartData = projections.map((p) => ({
    month: p.month,
    Einnahmen: p.projected_income,
    Ausgaben: p.projected_expenses,
    Saldo: p.projected_balance,
    Kumuliert: p.cumulative_balance,
  }))

  const lineConfig = [
    { key: "Einnahmen", color: isDark ? "#34d399" : "#10b981", label: "Einnahmen", enabled: true },
    { key: "Ausgaben", color: isDark ? "#f87171" : "#ef4444", label: "Ausgaben", enabled: true },
    { key: "Saldo", color: isDark ? "#60a5fa" : "#3b82f6", label: "Saldo", enabled: true },
    { key: "Kumuliert", color: isDark ? "#818cf8" : "#6366f1", label: "Kumuliert", enabled: true, dashed: true },
  ]

  const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "#f3f4f6"
  const textColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#6b7280"
  const tooltipBg = isDark ? "rgba(30, 30, 35, 0.98)" : "rgba(255, 255, 255, 0.98)"
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
  const tooltipText = isDark ? "rgba(255, 255, 255, 0.95)" : "#1f2937"

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const visiblePayload = activeLine 
      ? payload.filter((p: any) => p.dataKey === activeLine)
      : payload.filter((p: any) => lineConfig.find(c => c.key === p.dataKey)?.enabled)

    if (visiblePayload.length === 0) return null

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
        <div className="space-y-1.5">
          {visiblePayload.map((entry: any, index: number) => {
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
                  {entry.value.toFixed(2)} €
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  const ChartContent = ({ height = "380px", showFullscreenButton = true }: { height?: string, showFullscreenButton?: boolean }) => (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
        <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">{title}</h4>
        <div className="flex items-center gap-2">
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
          {showFullscreenButton && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors"
              aria-label="Vergrößern"
            >
              <Maximize2 className="h-3.5 w-3.5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
            </button>
          )}
        </div>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData}
            onMouseLeave={() => setActiveLine(null)}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
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
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                style={{ transition: 'opacity 0.3s ease, stroke-width 0.3s ease' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  return (
    <>
      <div className="glass-effect premium-shadow rounded-xl p-5 sm:p-6">
        <ChartContent />
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-6xl h-full max-h-[90vh] bg-finsim-surface dark:bg-finsim-dark-surface rounded-2xl border border-finsim-border dark:border-finsim-dark-border shadow-2xl p-6 overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
                  {title}
                </h3>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors"
                  aria-label="Schließen"
                >
                  <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
                </button>
              </div>
              <ChartContent height="calc(90vh - 120px)" showFullscreenButton={false} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
