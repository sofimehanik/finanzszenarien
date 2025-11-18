"use client"

import { useCallback } from "react"

export interface PdfSummary {
  goal?: string
  totalIncome: number
  totalExpenses: number
  netBalance: number
  bestTitle?: string
  bestFinal?: number
  realisticTitle?: string
  realisticFinal?: number
  worstTitle?: string
  worstFinal?: number
}

interface PdfExportButtonProps {
  summary?: PdfSummary
}

export default function PdfExportButton({ summary }: PdfExportButtonProps) {
  if (typeof window === "undefined") return null

  const handleExport = useCallback(async () => {
    const root = document.getElementById("finsim-analysis-root")
    if (!root) {
      console.error("PDF Export: Container #finsim-analysis-root nicht gefunden.")
      return
    }

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ])

    // A4 portrait in mm
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 12 // mm

    let cursorY = margin
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(16)
    pdf.text("FinSim Analyse", margin, cursorY)
    cursorY += 8

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(11)
    const today = new Date().toLocaleDateString("de-DE")
    pdf.text(`Datum: ${today}`, margin, cursorY)
    cursorY += 6

    if (summary?.goal) {
      pdf.setFontSize(11)
      pdf.text("Ziel / Frage:", margin, cursorY)
      cursorY += 5
      const splitGoal = pdf.splitTextToSize(summary.goal, pageWidth - margin * 2)
      pdf.text(splitGoal, margin, cursorY)
      cursorY += 6 + splitGoal.length * 4
    }

    if (summary) {
      pdf.setFontSize(11)
      pdf.text(`Gesamteinnahmen: ${summary.totalIncome.toFixed(2)} €`, margin, cursorY)
      cursorY += 5
      pdf.text(`Gesamtausgaben: ${summary.totalExpenses.toFixed(2)} €`, margin, cursorY)
      cursorY += 5
      pdf.text(`Aktuelles Guthaben: ${summary.netBalance.toFixed(2)} €`, margin, cursorY)
      cursorY += 8

      pdf.setFont("helvetica", "bold")
      pdf.text("Szenarien (Endguthaben)", margin, cursorY)
      pdf.setFont("helvetica", "normal")
      cursorY += 5

      if (summary.bestTitle && typeof summary.bestFinal === "number") {
        pdf.text(`Best Case – ${summary.bestTitle}: ${summary.bestFinal.toFixed(2)} €`, margin, cursorY)
        cursorY += 5
      }
      if (summary.realisticTitle && typeof summary.realisticFinal === "number") {
        pdf.text(
          `Realistisch – ${summary.realisticTitle}: ${summary.realisticFinal.toFixed(2)} €`,
          margin,
          cursorY
        )
        cursorY += 5
      }
      if (summary.worstTitle && typeof summary.worstFinal === "number") {
        pdf.text(`Worst Case – ${summary.worstTitle}: ${summary.worstFinal.toFixed(2)} €`, margin, cursorY)
        cursorY += 5
      }
    }

    // Add a new page for the visual dashboard
    pdf.addPage()

    // Render the analysis area to canvas
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: document.documentElement.clientWidth,
    })

    const imgData = canvas.toDataURL("image/png")

    const printableWidth = pageWidth - margin * 2
    const printableHeight = pageHeight - margin * 2

    const imgWidthMm = canvas.width * 0.264583
    const imgHeightMm = canvas.height * 0.264583

    const scale = Math.min(printableWidth / imgWidthMm, printableHeight / imgHeightMm)

    const renderWidth = imgWidthMm * scale
    const renderHeight = imgHeightMm * scale

    const x = (pageWidth - renderWidth) / 2
    const y = (pageHeight - renderHeight) / 2

    pdf.addImage(imgData, "PNG", x, y, renderWidth, renderHeight)

    const filename = `finsim-analyse-${new Date().toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)
  }, [summary])

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

