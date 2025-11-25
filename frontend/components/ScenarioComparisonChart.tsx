"use client"

import { useState, useEffect } from "react"
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts"
import { ScenarioProjection } from "@/lib/api"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, Maximize2, X } from "lucide-react"

interface ScenarioComparisonChartProps {
  bestCase: ScenarioProjection[]
  realisticCase: ScenarioProjection[]
  worstCase: ScenarioProjection[]
}

export function ScenarioComparisonChart({ 
  bestCase, 
  realisticCase, 
  worstCase 
}: ScenarioComparisonChartProps) {
  const [isDark, setIsDark] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeMetric, setActiveMetric] = useState<"balance" | "cumulative">("cumulative")

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

  // Prepare data for comparison
  const chartData = bestCase.map((best, index) => {
    const realistic = realisticCase[index]
    const worst = worstCase[index]
    
    return {
      month: best.month,
      "Best Case": activeMetric === "balance" ? best.projected_balance : best.cumulative_balance,
      "Realistisch": activeMetric === "balance" ? realistic.projected_balance : realistic.cumulative_balance,
      "Worst Case": activeMetric === "balance" ? worst.projected_balance : worst.cumulative_balance,
      // For area chart confidence intervals
      "Best Max": activeMetric === "balance" ? best.projected_balance : best.cumulative_balance,
      "Best Min": activeMetric === "balance" ? best.projected_balance : best.cumulative_balance,
      "Worst Max": activeMetric === "balance" ? worst.projected_balance : worst.cumulative_balance,
      "Worst Min": activeMetric === "balance" ? worst.projected_balance : worst.cumulative_balance,
    }
  })

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
        className="rounded-2xl border backdrop-blur-xl shadow-2xl p-4 min-w-[200px]"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          boxShadow: isDark 
            ? "0 20px 40px rgba(0, 0, 0, 0.5)" 
            : "0 20px 40px rgba(0, 0, 0, 0.15)"
        }}
      >
        <p className="text-xs font-semibold mb-3 text-finsim-textMain dark:text-finsim-dark-textMain border-b border-finsim-borderLight dark:border-finsim-dark-borderLight pb-2">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
              const colors: Record<string, string> = {
                "Best Case": isDark ? "#34d399" : "#10b981",
                "Realistisch": isDark ? "#60a5fa" : "#3b82f6",
                "Worst Case": isDark ? "#f87171" : "#ef4444"
              }
              const color = colors[entry.dataKey] || entry.color
              
              return (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                      {entry.dataKey}:
                    </span>
                  </div>
                  <span 
                    className="text-xs font-bold font-mono"
                    style={{ color }}
                  >
                    {entry.value >= 0 ? "+" : ""}
                    {entry.value.toFixed(2)} €
                  </span>
                </div>
              )
            })}
        </div>
      </motion.div>
    )
  }

  const ChartContent = ({ height = "450px" }: { height?: string }) => (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
            12-Monats-Vorschau der Szenarien
          </h4>
          <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
            Vergleich aller drei Szenarien
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated rounded-lg p-1 border border-finsim-borderLight dark:border-finsim-dark-borderLight">
            <button
              onClick={() => setActiveMetric("balance")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeMetric === "balance"
                  ? "bg-finsim-primary/10 text-finsim-primary dark:bg-finsim-dark-primary/20 dark:text-finsim-dark-primary"
                  : "text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-finsim-textMain"
              }`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setActiveMetric("cumulative")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeMetric === "cumulative"
                  ? "bg-finsim-primary/10 text-finsim-primary dark:bg-finsim-dark-primary/20 dark:text-finsim-dark-primary"
                  : "text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-finsim-textMain"
              }`}
            >
              Kumuliert
            </button>
          </div>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors"
            aria-label="Vergrößern"
          >
            <Maximize2 className="h-4 w-4 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
          </button>
        </div>
      </div>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
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
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value) => (
                <span style={{ 
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#6b7280',
                  fontSize: '11px',
                  fontWeight: 500
                }}>
                  {value}
                </span>
              )}
            />
            
            {/* Zero line reference */}
            <ReferenceLine 
              y={0} 
              stroke={isDark ? "rgba(255, 255, 255, 0.2)" : "#d1d5db"} 
              strokeDasharray="2 2"
            />
            
            {/* Main scenario lines */}
            <Line
              type="monotone"
              dataKey="Best Case"
              stroke={isDark ? "#34d399" : "#10b981"}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2 }}
              name="Best Case"
            />
            <Line
              type="monotone"
              dataKey="Realistisch"
              stroke={isDark ? "#60a5fa" : "#3b82f6"}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 7, strokeWidth: 2 }}
              name="Realistisch"
            />
            <Line
              type="monotone"
              dataKey="Worst Case"
              stroke={isDark ? "#f87171" : "#ef4444"}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2 }}
              name="Worst Case"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend with icons */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-finsim-borderLight dark:border-finsim-dark-borderLight">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
            Optimistisch
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Minus className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
          <span className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
            Realistisch
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
          <span className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
            Konservativ
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="glass-effect premium-shadow rounded-xl p-5 sm:p-6">
        <ChartContent />
      </div>

      {/* Fullscreen Modal */}
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
            className="relative w-full max-w-7xl h-full max-h-[90vh] bg-finsim-surface dark:bg-finsim-dark-surface rounded-2xl border border-finsim-border dark:border-finsim-dark-border shadow-2xl p-6 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
                12-Monats-Vorschau der Szenarien
              </h3>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors"
                aria-label="Schließen"
              >
                <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
              </button>
            </div>
            <ChartContent height="calc(90vh - 120px)" />
          </motion.div>
        </motion.div>
      )}
    </>
  )
}

