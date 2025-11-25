"use client"

import { useCallback } from "react"
import { AnalysisResponse } from "@/lib/api"

export interface PdfSummary {
  goal?: string
  totalIncome: number
  totalExpenses: number
  netBalance: number
  savingsRate: number
  bestTitle?: string
  bestFinal?: number
  bestProjections?: Array<{ month: string; cumulative_balance: number }>
  realisticTitle?: string
  realisticFinal?: number
  realisticProjections?: Array<{ month: string; cumulative_balance: number }>
  worstTitle?: string
  worstFinal?: number
  worstProjections?: Array<{ month: string; cumulative_balance: number }>
  summary?: string
  tips?: string
}

interface PdfExportButtonProps {
  summary?: PdfSummary
  analysis?: AnalysisResponse
}

export default function PdfExportButton({ summary, analysis }: PdfExportButtonProps) {
  const handleExport = useCallback(async () => {
    if (!summary) {
      console.error("PDF Export: Keine Daten verfügbar")
      return
    }

    const [{ jsPDF }] = await Promise.all([
      import("jspdf"),
    ])

    // A4 portrait in mm
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20 // Increased margin for cleaner look
    const contentWidth = pageWidth - margin * 2

    let cursorY = margin

    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (cursorY + requiredHeight > pageHeight - margin) {
        pdf.addPage()
        cursorY = margin
        return true
      }
      return false
    }

    // Helper to format currency
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    }

    // Helper to convert hex to RGB
    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0]
    }

    // Helper to draw rounded rectangle (simulated)
    const drawRoundedRect = (x: number, y: number, w: number, h: number, color: string, alpha: number = 0.08) => {
      const rgb = hexToRgb(color)
      pdf.setDrawColor(rgb[0], rgb[1], rgb[2], alpha * 255)
      pdf.setFillColor(rgb[0], rgb[1], rgb[2], alpha * 255)
      pdf.roundedRect(x, y, w, h, 2, 2, 'FD')
    }

    // Modern Header - Minimal Apple Style
    pdf.setFillColor(250, 250, 250)
    pdf.rect(0, 0, pageWidth, 25, 'F')
    
    pdf.setTextColor(20, 20, 20)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(24)
    pdf.text("FinSim", margin, 18)
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(9)
    pdf.setTextColor(120, 120, 120)
    const today = new Date().toLocaleDateString("de-DE", { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    pdf.text(today, pageWidth - margin - 30, 18)
    
    cursorY = 35

    // Goal Section - Clean Card Style
    if (summary.goal) {
      checkPageBreak(20)
      drawRoundedRect(margin, cursorY, contentWidth, 18, "#6366f1", 0.05)
      
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text("ZIEL", margin + 4, cursorY + 6)
      
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(11)
      pdf.setTextColor(30, 30, 30)
      const splitGoal = pdf.splitTextToSize(summary.goal, contentWidth - 8)
      pdf.text(splitGoal, margin + 4, cursorY + 11)
      cursorY += 18 + 8
    }

    // Key Metrics - Premium Cards (Apple/Monobank Style)
    checkPageBreak(50)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.setTextColor(20, 20, 20)
    pdf.text("Finanzübersicht", margin, cursorY)
    cursorY += 8

    const cardHeight = 28
    const cardWidth = (contentWidth - 6) / 2 // 2x2 grid

    // Net Balance Card - Hero
    const isPositive = summary.netBalance >= 0
    const balanceColor = isPositive ? "#10b981" : "#ef4444"
    drawRoundedRect(margin, cursorY, cardWidth, cardHeight, balanceColor, 0.1)
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(120, 120, 120)
    pdf.text("NETTO-SALDO", margin + 6, cursorY + 7)
    
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(18)
    const balanceRgb = hexToRgb(balanceColor)
    pdf.setTextColor(balanceRgb[0], balanceRgb[1], balanceRgb[2])
    pdf.text(formatCurrency(summary.netBalance), margin + 6, cursorY + 18)
    
    if (isPositive) {
      pdf.setFontSize(7)
      pdf.setTextColor(16, 185, 129)
      pdf.text("✓ Positiv", margin + 6, cursorY + 24)
    }

    // Savings Rate Card
    const savingsColor = summary.savingsRate >= 20 ? "#8b5cf6" : summary.savingsRate >= 10 ? "#3b82f6" : "#f97316"
    drawRoundedRect(margin + cardWidth + 2, cursorY, cardWidth, cardHeight, savingsColor, 0.1)
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(120, 120, 120)
    pdf.text("SPARQUOTE", margin + cardWidth + 8, cursorY + 7)
    
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(18)
    const savingsRgb = hexToRgb(savingsColor)
    pdf.setTextColor(savingsRgb[0], savingsRgb[1], savingsRgb[2])
    pdf.text(`${summary.savingsRate.toFixed(1)}%`, margin + cardWidth + 8, cursorY + 18)
    
    // Progress bar
    const progressWidth = (cardWidth - 12) * (Math.min(100, summary.savingsRate) / 100)
    pdf.setFillColor(savingsRgb[0], savingsRgb[1], savingsRgb[2])
    pdf.roundedRect(margin + cardWidth + 8, cursorY + 22, progressWidth, 3, 1.5, 1.5, 'F')

    // Income Card
    const incomeRgb = hexToRgb("#10b981")
    drawRoundedRect(margin, cursorY + cardHeight + 2, cardWidth, cardHeight, "#10b981", 0.1)
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(120, 120, 120)
    pdf.text("EINNAHMEN", margin + 6, cursorY + cardHeight + 9)
    
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(16)
    pdf.setTextColor(incomeRgb[0], incomeRgb[1], incomeRgb[2])
    pdf.text(formatCurrency(summary.totalIncome), margin + 6, cursorY + cardHeight + 20)
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    const avgIncome = summary.totalIncome / 12
    pdf.text(`Ø ${formatCurrency(avgIncome)}/Monat`, margin + 6, cursorY + cardHeight + 26)

    // Expenses Card
    const expenseRgb = hexToRgb("#ef4444")
    drawRoundedRect(margin + cardWidth + 2, cursorY + cardHeight + 2, cardWidth, cardHeight, "#ef4444", 0.1)
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(120, 120, 120)
    pdf.text("AUSGABEN", margin + cardWidth + 8, cursorY + cardHeight + 9)
    
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(16)
    pdf.setTextColor(expenseRgb[0], expenseRgb[1], expenseRgb[2])
    pdf.text(formatCurrency(summary.totalExpenses), margin + cardWidth + 8, cursorY + cardHeight + 20)
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    const avgExpense = summary.totalExpenses / 12
    pdf.text(`Ø ${formatCurrency(avgExpense)}/Monat`, margin + cardWidth + 8, cursorY + cardHeight + 26)

    cursorY += cardHeight * 2 + 12

    // Category Breakdown (if available from analysis)
    if (analysis?.finance_data?.categories) {
      checkPageBreak(60)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(14)
      pdf.setTextColor(20, 20, 20)
      pdf.text("Ausgaben nach Kategorien", margin, cursorY)
      cursorY += 8

      const categories = Object.entries(analysis.finance_data.categories)
        .map(([name, value]) => ({ name, value: Math.abs(value as number) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8) // Top 8 categories

      const totalExpenses = categories.reduce((sum, cat) => sum + cat.value, 0)
      
      const categoryColors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]
      
      categories.forEach((category, index) => {
        if (index % 2 === 0 && index > 0) {
          cursorY += 12
        }
        
        const percent = (category.value / totalExpenses) * 100
        const x = margin + (index % 2) * (contentWidth / 2 + 2)
        const y = cursorY
        
        // Category card
        const catColor = categoryColors[index % categoryColors.length]
        drawRoundedRect(x, y, contentWidth / 2 - 1, 12, catColor, 0.05)
        
        // Category name
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(9)
        pdf.setTextColor(30, 30, 30)
        const catName = category.name.charAt(0).toUpperCase() + category.name.slice(1).toLowerCase()
        pdf.text(catName, x + 4, y + 6)
        
        // Amount and percentage
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(`${formatCurrency(category.value)} • ${percent.toFixed(1)}%`, x + 4, y + 10)
        
        // Progress bar
        const barWidth = (contentWidth / 2 - 8) * (percent / 100)
        const catRgb = hexToRgb(catColor)
        pdf.setFillColor(catRgb[0], catRgb[1], catRgb[2])
        pdf.roundedRect(x + 4, y + 11.5, barWidth, 1.5, 0.75, 0.75, 'F')
      })
      
      cursorY += 12 + 8
    }

    // Scenario Projections - Premium Section
    checkPageBreak(80)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.setTextColor(20, 20, 20)
    pdf.text("Szenario-Projektionen", margin, cursorY)
    cursorY += 8

    // Scenario cards in row
    const scenarioHeight = 16
    const scenarioWidth = (contentWidth - 4) / 3

    if (summary.bestTitle && typeof summary.bestFinal === "number") {
      const bestRgb = hexToRgb("#10b981")
      drawRoundedRect(margin, cursorY, scenarioWidth - 1, scenarioHeight, "#10b981", 0.1)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(9)
      pdf.setTextColor(100, 100, 100)
      pdf.text("BEST CASE", margin + 4, cursorY + 5)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(12)
      pdf.setTextColor(bestRgb[0], bestRgb[1], bestRgb[2])
      pdf.text(formatCurrency(summary.bestFinal), margin + 4, cursorY + 12)
    }

    if (summary.realisticTitle && typeof summary.realisticFinal === "number") {
      const realisticRgb = hexToRgb("#3b82f6")
      drawRoundedRect(margin + scenarioWidth, cursorY, scenarioWidth - 1, scenarioHeight, "#3b82f6", 0.1)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(9)
      pdf.setTextColor(100, 100, 100)
      pdf.text("REALISTISCH", margin + scenarioWidth + 4, cursorY + 5)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(12)
      pdf.setTextColor(realisticRgb[0], realisticRgb[1], realisticRgb[2])
      pdf.text(formatCurrency(summary.realisticFinal), margin + scenarioWidth + 4, cursorY + 12)
    }

    if (summary.worstTitle && typeof summary.worstFinal === "number") {
      const worstRgb = hexToRgb("#ef4444")
      drawRoundedRect(margin + scenarioWidth * 2, cursorY, scenarioWidth - 1, scenarioHeight, "#ef4444", 0.1)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(9)
      pdf.setTextColor(100, 100, 100)
      pdf.text("WORST CASE", margin + scenarioWidth * 2 + 4, cursorY + 5)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(12)
      pdf.setTextColor(worstRgb[0], worstRgb[1], worstRgb[2])
      pdf.text(formatCurrency(summary.worstFinal), margin + scenarioWidth * 2 + 4, cursorY + 12)
    }

    cursorY += scenarioHeight + 10

    // Scenario Chart - Enhanced
    if (summary.bestProjections && summary.realisticProjections && summary.worstProjections) {
      checkPageBreak(70)
      
      const chartHeight = 55
      const chartY = cursorY
      const chartX = margin
      const chartWidth = contentWidth

      // Chart background with subtle border
      pdf.setDrawColor(240, 240, 240)
      pdf.setFillColor(255, 255, 255)
      pdf.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'FD')

      // Find min and max for scaling
      const allValues = [
        ...summary.bestProjections.map(p => p.cumulative_balance),
        ...summary.realisticProjections.map(p => p.cumulative_balance),
        ...summary.worstProjections.map(p => p.cumulative_balance)
      ]
      const minValue = Math.min(...allValues)
      const maxValue = Math.max(...allValues)
      const valueRange = maxValue - minValue || 1

      // Grid lines
      pdf.setDrawColor(245, 245, 245)
      for (let i = 0; i <= 4; i++) {
        const y = chartY + 8 + (chartHeight - 16) * (1 - i / 4)
        pdf.line(chartX + 15, y, chartX + chartWidth - 5, y)
      }

      // Axes
      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.5)
      pdf.line(chartX + 15, chartY + 8, chartX + 15, chartY + chartHeight - 8)
      pdf.line(chartX + 15, chartY + chartHeight - 8, chartX + chartWidth - 5, chartY + chartHeight - 8)

      // Draw scenario lines with better styling
      const drawLine = (projections: Array<{ month: string; cumulative_balance: number }>, color: string, width: number = 1.5) => {
        if (projections.length === 0) return
        
        const rgb = hexToRgb(color)
        pdf.setDrawColor(rgb[0], rgb[1], rgb[2])
        pdf.setLineWidth(width)
        
        const pointWidth = (chartWidth - 20) / Math.max(1, projections.length - 1)
        
        for (let i = 0; i < projections.length - 1; i++) {
          const x1 = chartX + 15 + i * pointWidth
          const y1 = chartY + chartHeight - 8 - ((projections[i].cumulative_balance - minValue) / valueRange) * (chartHeight - 16)
          const x2 = chartX + 15 + (i + 1) * pointWidth
          const y2 = chartY + chartHeight - 8 - ((projections[i + 1].cumulative_balance - minValue) / valueRange) * (chartHeight - 16)
          
          pdf.line(x1, y1, x2, y2)
        }
      }

      drawLine(summary.bestProjections, "#10b981", 2)
      drawLine(summary.realisticProjections, "#3b82f6", 2)
      drawLine(summary.worstProjections, "#ef4444", 2)

      // Enhanced legend
      const legendY = chartY + chartHeight + 4
      const legendItems = [
        { label: "Best Case", color: "#10b981" },
        { label: "Realistisch", color: "#3b82f6" },
        { label: "Worst Case", color: "#ef4444" }
      ]
      
      legendItems.forEach((item, index) => {
        const x = margin + index * 50
        const rgb = hexToRgb(item.color)
        pdf.setFillColor(rgb[0], rgb[1], rgb[2])
        pdf.circle(x, legendY, 2, 'F')
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(8)
        pdf.setTextColor(80, 80, 80)
        pdf.text(item.label, x + 4, legendY + 1.5)
      })

      // Y-axis labels
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(7)
      pdf.setTextColor(140, 140, 140)
      for (let i = 0; i <= 4; i++) {
        const value = minValue + (valueRange * i / 4)
        const y = chartY + 8 + (chartHeight - 16) * (1 - i / 4)
        const valueText = formatCurrency(value)
        const textWidth = valueText.length * 1.3
        pdf.text(valueText, chartX + 13 - textWidth, y + 1.5)
      }

      // X-axis labels
      if (summary.bestProjections.length > 0) {
        const firstMonth = summary.bestProjections[0].month
        const lastMonth = summary.bestProjections[summary.bestProjections.length - 1].month
        const middleIndex = Math.floor(summary.bestProjections.length / 2)
        const middleMonth = summary.bestProjections[middleIndex]?.month

        pdf.setFontSize(7)
        pdf.text(firstMonth, chartX + 15, chartY + chartHeight + 2)
        if (middleMonth) {
          const middleX = chartX + 15 + (chartWidth - 20) / 2
          const textWidth = middleMonth.length * 1.1
          pdf.text(middleMonth, middleX - textWidth / 2, chartY + chartHeight + 2)
        }
        const lastTextWidth = lastMonth.length * 1.1
        pdf.text(lastMonth, chartX + chartWidth - 5 - lastTextWidth, chartY + chartHeight + 2)
      }

      cursorY += chartHeight + 20
    }

    // Summary Section - Clean Typography
    if (summary.summary) {
      checkPageBreak(40)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(14)
      pdf.setTextColor(20, 20, 20)
      pdf.text("Zusammenfassung", margin, cursorY)
      cursorY += 8

      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(9)
      pdf.setTextColor(60, 60, 60)
      const summaryText = summary.summary.replace(/\*\*/g, '').replace(/#{1,6}\s/g, '').substring(0, 800)
      const splitSummary = pdf.splitTextToSize(summaryText, contentWidth)
      pdf.text(splitSummary, margin, cursorY)
      cursorY += splitSummary.length * 4.5 + 6
    }

    // Tips Section - Structured
    if (summary.tips) {
      checkPageBreak(50)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(14)
      pdf.setTextColor(20, 20, 20)
      pdf.text("Handlungsempfehlungen", margin, cursorY)
      cursorY += 8

      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(9)
      pdf.setTextColor(60, 60, 60)
      const tipsText = summary.tips.replace(/\*\*/g, '').replace(/#{1,6}\s/g, '').substring(0, 600)
      const splitTips = pdf.splitTextToSize(tipsText, contentWidth)
      pdf.text(splitTips, margin, cursorY)
      cursorY += splitTips.length * 4.5
    }

    // Modern Footer
    const footerY = pageHeight - 15
    pdf.setDrawColor(240, 240, 240)
    pdf.line(margin, footerY, pageWidth - margin, footerY)
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.text("Erstellt mit FinSim", margin, footerY + 5)
    
    const pageText = "Seite 1"
    const pageTextWidth = pageText.length * 1.5
    pdf.text(pageText, pageWidth - margin - pageTextWidth, footerY + 5)

    const filename = `finsim-analyse-${new Date().toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)
  }, [summary, analysis])

  if (typeof window === "undefined") return null

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center justify-center rounded-lg bg-finsim-primary dark:bg-finsim-dark-primary text-white px-6 py-2.5 text-sm font-medium hover:bg-finsim-primaryHover dark:hover:bg-finsim-dark-primaryHover transition-colors"
    >
      Analyse als PDF herunterladen
    </button>
  )
}
