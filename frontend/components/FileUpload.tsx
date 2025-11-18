"use client"

import { useState, useRef } from "react"
import { Upload, Plus, X, ArrowUpCircle } from "lucide-react"
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
    <section className="glass-effect premium-shadow rounded-[24px] p-8 sm:p-10 space-y-8 animate-fade-in-up-delay">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Finanzdaten</h3>
          <p className="text-base text-finsim-textSecondary dark:text-finsim-dark-textSecondary">CSV hochladen oder Transaktionen manuell eingeben</p>
        </div>
        <div className="inline-flex rounded-full bg-finsim-surfaceMuted dark:bg-finsim-dark-surfaceMuted p-1">
          <button
            onClick={() => setInputMode("csv")}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${inputMode === "csv" ? "bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain shadow-sm" : "text-finsim-textMuted dark:text-finsim-dark-textMuted"}`}
          >
            CSV hochladen
          </button>
          <button
            onClick={() => setInputMode("manual")}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${inputMode === "manual" ? "bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain shadow-sm" : "text-finsim-textMuted dark:text-finsim-dark-textMuted"}`}
          >
            Manuell eingeben
          </button>
        </div>
      </div>

        {inputMode === "csv" ? (
            <div
              className={`relative border-2 border-dashed rounded-[24px] p-12 sm:p-16 text-center transition-all duration-300 premium-hover ${
                dragActive
                  ? "border-finsim-primary/50 dark:border-finsim-dark-primary/50 bg-gradient-to-br from-finsim-primary/5 to-purple-500/5 dark:from-finsim-dark-primary/10 dark:to-purple-500/10 soft-glow"
                  : "border-finsim-borderLight/50 dark:border-finsim-dark-borderLight/30 bg-gradient-to-br from-white/40 to-gray-50/20 dark:from-finsim-dark-surfaceElevated/40 dark:to-gray-900/20"
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
              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full blur-xl ${dragActive ? 'bg-finsim-primary/20 dark:bg-finsim-dark-primary/30' : 'bg-finsim-primary/10 dark:bg-finsim-dark-primary/10'} transition-all duration-300`}></div>
                  <ArrowUpCircle className={`relative mx-auto h-16 w-16 ${dragActive ? 'text-finsim-primary dark:text-finsim-dark-primary pulse-soft' : 'text-finsim-textSecondary/60 dark:text-finsim-dark-textSecondary/60'} transition-all duration-300`} />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium text-finsim-textMain dark:text-finsim-dark-textMain">
                    {dragActive ? "Datei hier ablegen" : "Ziehe deine CSV-Datei hierher"}
                  </p>
                  <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                    oder klicke zum Auswählen
                  </p>
                </div>
                <button
                  onClick={onButtonClick}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-full bg-finsim-primary dark:bg-finsim-dark-primary text-white px-8 py-3.5 text-base font-medium hover:bg-finsim-primaryHover dark:hover:bg-finsim-dark-primaryHover transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 premium-shadow"
                >
                  {isLoading ? "Wird verarbeitet..." : "Datei auswählen"}
                </button>
                <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted mt-2">
                  Erwartetes Format: date, amount, category, description
                </p>
              </div>
            </div>
          ) : (
        <div className="space-y-4">
          {/* Manual form */}
          <div className="grid gap-3 md:gap-4 lg:gap-5 md:grid-cols-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-2xl border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 dark:focus:ring-finsim-dark-primary/40 focus:border-finsim-primary dark:focus:border-finsim-dark-primary"
            />
            <div className="md:col-span-2 flex w-full items-stretch gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsExpense((v) => !v)}
                className={`whitespace-nowrap rounded-2xl border px-3 py-2.5 text-sm font-medium transition shadow-sm ${
                  isExpense
                    ? "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30"
                    : "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/30"
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
                className="min-w-0 flex-1 rounded-2xl border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 dark:focus:ring-finsim-dark-primary/40 focus:border-finsim-primary dark:focus:border-finsim-dark-primary"
              />
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Kategorie (z.B. Miete)"
              className="md:col-span-2 min-w-0 rounded-2xl border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 dark:focus:ring-finsim-dark-primary/40 focus:border-finsim-primary dark:focus:border-finsim-dark-primary"
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
              className="md:col-span-4 rounded-2xl border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 dark:focus:ring-finsim-dark-primary/40 focus:border-finsim-primary dark:focus:border-finsim-dark-primary"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addManualTransaction}
              disabled={isLoading}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-finsim-primary dark:bg-finsim-dark-primary text-white px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md hover:bg-finsim-primaryHover dark:hover:bg-finsim-dark-primaryHover transition"
            >
              <Plus className="h-4 w-4 mr-1" />
              Transaktion hinzufügen
            </button>
            <button
              onClick={startAnalysisWithManual}
              disabled={isLoading || manualTransactions.length === 0}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-finsim-primary dark:bg-finsim-dark-primary text-white px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md hover:bg-finsim-primaryHover dark:hover:bg-finsim-dark-primaryHover transition disabled:opacity-50"
            >
              Analyse starten
            </button>
          </div>

          {manualTransactions.length === 0 && (
            <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted mt-2">
              Füge zuerst mindestens eine Transaktion hinzu oder lade eine CSV-Datei hoch.
            </p>
          )}

          {manualTransactions.length > 0 && (
            <div className="mt-4 border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-2xl bg-finsim-surface dark:bg-finsim-dark-surface overflow-hidden">
              <div className="grid grid-cols-5 gap-2 bg-finsim-surfaceMuted dark:bg-finsim-dark-surfaceMuted text-xs uppercase tracking-wide text-finsim-textMuted dark:text-finsim-dark-textMuted px-3 py-2">
                <div>Datum</div>
                <div>Betrag</div>
                <div>Kategorie</div>
                <div className="col-span-2">Beschreibung</div>
              </div>
              <div className="text-sm divide-y divide-finsim-borderLight dark:divide-finsim-dark-borderLight">
                {manualTransactions.map((t, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-center px-3 py-2 text-finsim-textMain dark:text-finsim-dark-textMain">
                    <div>{t.date}</div>
                    <div className={t.amount < 0 ? "text-red-500 dark:text-red-400" : "text-finsim-accent dark:text-finsim-dark-accent"}>
                      {t.amount.toFixed(2)} €
                    </div>
                    <div>{t.category}</div>
                    <div className="col-span-1 truncate" title={t.description}>{t.description}</div>
                    <button
                      aria-label="Entfernen"
                      onClick={() => removeManualTransaction(idx)}
                      className="justify-self-end text-finsim-textMuted dark:text-finsim-dark-textMuted hover:text-red-500 dark:hover:text-red-400 transition"
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

