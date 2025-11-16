"use client"

import { useState, useRef } from "react"
import { Upload, Plus, X } from "lucide-react"
import type { Transaction } from "@/lib/api"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [inputMode, setInputMode] = useState<"csv" | "manual">("csv")
  const [manualTransactions, setManualTransactions] = useState<Transaction[]>([])
  const [date, setDate] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [isExpense, setIsExpense] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        onFileSelect(file)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0])
    }
  }

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  const addManualTransaction = () => {
    const parsedAmount = parseFloat((amount || "").replace(",", "."))
    if (!date || isNaN(parsedAmount) || !category.trim()) return
    let finalAmount = parsedAmount
    if (isExpense && finalAmount > 0) finalAmount = -finalAmount
    if (!isExpense && finalAmount < 0) finalAmount = Math.abs(finalAmount)
    const tx: Transaction = {
      date,
      amount: finalAmount,
      category: category.trim(),
      description: description.trim(),
    }
    setManualTransactions((prev) => [...prev, tx])
    // Keep date for convenience, clear others
    setAmount("")
    setCategory("")
    setDescription("")
  }

  const removeManualTransaction = (index: number) => {
    setManualTransactions((prev) => prev.filter((_, i) => i !== index))
  }

  const startAnalysisWithManual = () => {
    if (manualTransactions.length === 0) return
    const header = "date,amount,category,description\n"
    const rows = manualTransactions
      .map((t) => [t.date, t.amount, t.category, (t.description || "").replace(/\n|\r/g, " ")]
        .map((v) => `${v}`).join(","))
      .join("\n")
    const csvString = header + rows + "\n"
    const blob = new Blob([csvString], { type: "text/csv" })
    const file = new File([blob], "manuelle_transaktionen.csv", { type: "text/csv" })
    onFileSelect(file)
  }

  return (
    <section className="bg-finsim-surface border border-finsim-border rounded-xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-finsim-textMain">Finanzdaten</h3>
          <p className="text-sm text-finsim-textSecondary">CSV hochladen oder Transaktionen manuell eingeben</p>
        </div>
        <div className="inline-flex rounded-full bg-finsim-surfaceMuted p-1">
          <button
            onClick={() => setInputMode("csv")}
            className={`px-3 py-1.5 rounded-full text-sm ${inputMode === "csv" ? "bg-finsim-surface text-finsim-textMain shadow-sm" : "text-finsim-textMuted"}`}
          >
            CSV hochladen
          </button>
          <button
            onClick={() => setInputMode("manual")}
            className={`px-3 py-1.5 rounded-full text-sm ${inputMode === "manual" ? "bg-finsim-surface text-finsim-textMain shadow-sm" : "text-finsim-textMuted"}`}
          >
            Manuell eingeben
          </button>
        </div>
      </div>

      {inputMode === "csv" ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-colors ${
            dragActive
              ? "border-finsim-primary bg-finsim-primaryLight"
              : "border-finsim-borderLight bg-finsim-surfaceElevated"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleChange}
            className="hidden"
            disabled={isLoading}
          />
          <Upload className="mx-auto h-10 w-10 text-finsim-textSecondary mb-4" />
          <p className="text-sm text-finsim-textSecondary mb-4">
            Ziehe deine CSV-Datei hierher oder klicke zum Auswählen
          </p>
          <button
            onClick={onButtonClick}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-finsim-border bg-finsim-surface text-finsim-textMain hover:bg-finsim-surfaceElevated px-4 py-2 text-sm font-medium transition disabled:opacity-50"
          >
            {isLoading ? "Wird verarbeitet..." : "Datei auswählen"}
          </button>
          <p className="text-xs text-finsim-textSecondary mt-4">
            Erwartetes Format: date, amount, category, description
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Manual form */}
          <div className="grid gap-3 md:gap-4 lg:gap-5 md:grid-cols-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-2xl border border-finsim-borderSoft bg-finsim-surface py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 focus:border-finsim-primary"
            />
            <div className="md:col-span-2 flex w-full items-stretch gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsExpense((v) => !v)}
                className={`whitespace-nowrap rounded-2xl border px-3 py-2.5 text-sm font-medium transition shadow-sm ${
                  isExpense
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {isExpense ? "Ausgabe" : "Einnahme"}
              </button>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Betrag"
                className="min-w-0 flex-1 rounded-2xl border border-finsim-borderSoft bg-finsim-surface py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 focus:border-finsim-primary"
              />
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Kategorie (z.B. Miete)"
              className="md:col-span-2 min-w-0 rounded-2xl border border-finsim-borderSoft bg-finsim-surface py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 focus:border-finsim-primary"
              list="category-options"
            />
            <datalist id="category-options">
              <option value="Miete" />
              <option value="Lebensmittel" />
              <option value="Transport" />
              <option value="Freizeit" />
              <option value="Gehalt" />
            </datalist>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung (optional)"
              className="md:col-span-4 rounded-2xl border border-finsim-borderSoft bg-finsim-surface py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 focus:border-finsim-primary"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addManualTransaction}
              disabled={isLoading}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-finsim-primary text-white px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md hover:bg-blue-600 transition"
            >
              <Plus className="h-4 w-4 mr-1" />
              Transaktion hinzufügen
            </button>
            <button
              onClick={startAnalysisWithManual}
              disabled={isLoading || manualTransactions.length === 0}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-finsim-primary text-white px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md hover:bg-blue-600 transition disabled:opacity-50"
            >
              Analyse starten
            </button>
          </div>

          {manualTransactions.length === 0 && (
            <p className="text-xs text-finsim-textMuted mt-2">
              Füge zuerst mindestens eine Transaktion hinzu oder lade eine CSV-Datei hoch.
            </p>
          )}

          {manualTransactions.length > 0 && (
            <div className="mt-4 border border-finsim-borderSoft rounded-2xl bg-finsim-surface overflow-hidden">
              <div className="grid grid-cols-5 gap-2 bg-finsim-surfaceMuted text-xs uppercase tracking-wide text-finsim-textMuted px-3 py-2">
                <div>Datum</div>
                <div>Betrag</div>
                <div>Kategorie</div>
                <div className="col-span-2">Beschreibung</div>
              </div>
              <div className="text-sm divide-y divide-finsim-borderSoft">
                {manualTransactions.map((t, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-center px-3 py-2">
                    <div>{t.date}</div>
                    <div className={t.amount < 0 ? "text-red-500" : "text-finsim-accent"}>
                      {t.amount.toFixed(2)} €
                    </div>
                    <div>{t.category}</div>
                    <div className="col-span-1 truncate" title={t.description}>{t.description}</div>
                    <button
                      aria-label="Entfernen"
                      onClick={() => removeManualTransaction(idx)}
                      className="justify-self-end text-finsim-textMuted hover:text-red-500 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

