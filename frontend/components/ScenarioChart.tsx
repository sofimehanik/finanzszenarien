"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ScenarioProjection } from "@/lib/api"

interface ScenarioChartProps {
  projections: ScenarioProjection[]
  title: string
}

export function ScenarioChart({ projections, title }: ScenarioChartProps) {
  const [activeLine, setActiveLine] = useState<string | null>(null)

  const chartData = projections.map((p) => ({
    month: p.month,
    Einnahmen: p.projected_income,
    Ausgaben: p.projected_expenses,
    Saldo: p.projected_balance,
    Kumuliert: p.cumulative_balance,
  }))

  const lineConfig = [
    { key: "Einnahmen", color: "#10b981", label: "Einnahmen" },
    { key: "Ausgaben", color: "#ef4444", label: "Ausgaben" },
    { key: "Saldo", color: "#3b82f6", label: "Saldo" },
    { key: "Kumuliert", color: "#6366f1", label: "Kumuliert", dashed: true },
  ]

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-finsim-borderLight">
        <h4 className="text-sm font-semibold text-finsim-textMain tracking-tight">{title}</h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          {lineConfig.map((config) => (
            <button
              key={config.key}
              onClick={() => setActiveLine(activeLine === config.key ? null : config.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                activeLine === config.key || activeLine === null
                  ? config.key === "Einnahmen"
                    ? "bg-emerald-50 text-emerald-700"
                    : config.key === "Ausgaben"
                    ? "bg-red-50 text-red-700"
                    : config.key === "Saldo"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-indigo-50 text-indigo-700"
                  : "opacity-40 hover:opacity-60 text-finsim-textSecondary"
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
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '8px 12px'
              }}
              formatter={(value: number, name: string) => {
                if (activeLine && activeLine !== name) return null
                return [`${value.toFixed(2)} €`, name]
              }}
              labelStyle={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: '#374151',
                marginBottom: '4px'
              }}
              itemStyle={{ fontSize: '12px', padding: '2px 0' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
              iconType="line"
              formatter={(value) => {
                if (activeLine && activeLine !== value) {
                  return <span style={{ opacity: 0.3, transition: 'opacity 0.2s ease' }}>{value}</span>
                }
                return <span style={{ transition: 'opacity 0.2s ease' }}>{value}</span>
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
                  stroke: '#fff',
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

