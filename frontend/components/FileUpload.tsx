"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, Plus, X, ArrowUpCircle, CheckCircle2, TrendingUp, TrendingDown, Calendar, Euro, Tag, FileText, Sparkles, Zap, Loader2, FileSpreadsheet, PenTool, Brain } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Transaction } from "@/lib/api"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
  canUseQuizData?: boolean
  onUseQuizData?: () => void
}

export function FileUpload({ onFileSelect, isLoading, canUseQuizData = false, onUseQuizData }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [inputMode, setInputMode] = useState<"csv" | "manual" | "quiz">("csv")
  const [manualTransactions, setManualTransactions] = useState<Transaction[]>([])
  const [date, setDate] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [isExpense, setIsExpense] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [fieldFocus, setFieldFocus] = useState<string | null>(null)
  const [showInfoTip, setShowInfoTip] = useState(true)

  useEffect(() => {
    if (!canUseQuizData && inputMode === "quiz") {
      setInputMode("csv")
    }
  }, [canUseQuizData, inputMode])

  // Popular categories with icons and color classes
  const popularCategories = [
    { name: "Lebensmittel", icon: "🛒", selectedClass: "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/20 shadow-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    { name: "Miete", icon: "🏠", selectedClass: "border-blue-400 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/20 shadow-blue-500/10 text-blue-700 dark:text-blue-300" },
    { name: "Transport", icon: "🚗", selectedClass: "border-purple-400 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-500/20 shadow-purple-500/10 text-purple-700 dark:text-purple-300" },
    { name: "Freizeit", icon: "🎬", selectedClass: "border-pink-400 dark:border-pink-500/50 bg-pink-50 dark:bg-pink-500/20 shadow-pink-500/10 text-pink-700 dark:text-pink-300" },
    { name: "Gehalt", icon: "💰", selectedClass: "border-green-400 dark:border-green-500/50 bg-green-50 dark:bg-green-500/20 shadow-green-500/10 text-green-700 dark:text-green-300" },
    { name: "Gesundheit", icon: "🏥", selectedClass: "border-red-400 dark:border-red-500/50 bg-red-50 dark:bg-red-500/20 shadow-red-500/10 text-red-700 dark:text-red-300" },
    { name: "Shopping", icon: "🛍️", selectedClass: "border-orange-400 dark:border-orange-500/50 bg-orange-50 dark:bg-orange-500/20 shadow-orange-500/10 text-orange-700 dark:text-orange-300" },
    { name: "Restaurant", icon: "🍽️", selectedClass: "border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/20 shadow-amber-500/10 text-amber-700 dark:text-amber-300" },
  ]

  // Calculate completion progress
  const getCompletionProgress = () => {
    let filled = 0
    if (date) filled++
    if (amount) filled++
    if (category) filled++
    if (description) filled++
    return (filled / 4) * 100
  }

  const progress = getCompletionProgress()

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

  const sanitizeAmount = (raw: string): number => {
    if (!raw || !raw.trim()) return NaN
    let cleaned = raw.replace(/[€\s]/g, "")
    if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".")
    } else if (cleaned.includes(",")) {
      cleaned = cleaned.replace(",", ".")
    }
    const result = parseFloat(cleaned)
    return isNaN(result) ? NaN : result
  }

  // Validate form for manual input
  const isFormValid = () => {
    if (!date || !category.trim() || !amount.trim()) return false
    const parsedAmount = sanitizeAmount(amount)
    return !isNaN(parsedAmount) && parsedAmount !== 0
  }

  const addManualTransaction = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const parsedAmount = sanitizeAmount(amount)
    if (!date || isNaN(parsedAmount) || parsedAmount === 0 || !category.trim()) {
      console.log("Validation failed:", { date, parsedAmount, category, amount })
      return
    }
    
    let finalAmount = parsedAmount
    if (isExpense && finalAmount > 0) finalAmount = -finalAmount
    if (!isExpense && finalAmount < 0) finalAmount = Math.abs(finalAmount)
    
    const tx: Transaction = {
      date,
      amount: finalAmount,
      category: category.trim(),
      description: description.trim(),
    }
    
    console.log("Adding transaction:", tx)
    setManualTransactions((prev) => [...prev, tx])
    
    // Show success animation
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
    
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
    <motion.section
      className="glass-effect premium-shadow rounded-[28px] p-8 sm:p-10 space-y-8 animate-fade-in-up-delay relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      data-section="fileUpload"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-finsim-primary/5 via-transparent to-finsim-accent/5" />
      <motion.div
        className="absolute -top-10 -right-10 w-40 h-40 bg-finsim-primary/10 dark:bg-finsim-dark-primary/10 blur-2xl rounded-full"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-finsim-primary/10 to-finsim-accent/10 dark:from-finsim-dark-primary/20 dark:to-finsim-dark-accent/20">
              <Upload className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-finsim-textMain dark:text-finsim-dark-textMain">Finanzdaten</h3>
          </div>
          <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary pl-12">
            Wähle deine bevorzugte Methode zur Dateneingabe
          </p>
        </div>

                {/* Mode Selection Cards - Premium OpenAI/Apple Style */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* CSV Upload Card */}
                  <motion.button
            onClick={() => setInputMode("csv")}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className={`group relative rounded-2xl p-5 border transition-all duration-200 text-left overflow-hidden ${
                      inputMode === "csv"
                        ? "border-finsim-primary/40 dark:border-finsim-dark-primary/40 bg-white/90 dark:bg-white/5 shadow-lg shadow-finsim-primary/10 dark:shadow-finsim-dark-primary/10"
                        : "border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-white/60 dark:hover:border-white/15 hover:bg-white/85 dark:hover:bg-white/8"
                    }`}
                  >
                    {/* Subtle background accent when selected */}
                    {inputMode === "csv" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-br from-finsim-primary/5 via-transparent to-transparent pointer-events-none"
                      />
                    )}
                    <div className="relative flex items-start gap-4">
                      <motion.div 
                        className={`p-3 rounded-xl transition-all duration-200 ${
                          inputMode === "csv"
                            ? "bg-finsim-primary/10 dark:bg-finsim-dark-primary/20 text-finsim-primary dark:text-finsim-dark-primary"
                            : "bg-white/40 dark:bg-white/5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary group-hover:bg-finsim-primary/5 dark:group-hover:bg-finsim-dark-primary/10"
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <FileSpreadsheet className="h-6 w-6" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-base font-semibold mb-1 transition-colors ${
                          inputMode === "csv"
                            ? "text-finsim-textMain dark:text-white"
                            : "text-finsim-textMain dark:text-white group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary"
                        }`}>
            CSV hochladen
                        </h4>
                        <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                          Empfohlen für vollständige Analysen mit historischen Daten
                        </p>
                      </div>
                    </div>
                    {inputMode === "csv" && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute top-3 right-3 w-5 h-5 bg-finsim-primary dark:bg-finsim-dark-primary rounded-full flex items-center justify-center shadow-sm"
                      >
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </motion.div>
                    )}
                  </motion.button>

                  {/* Manual Input Card */}
                  <motion.button
            onClick={() => setInputMode("manual")}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className={`group relative rounded-2xl p-5 border transition-all duration-200 text-left overflow-hidden ${
                      inputMode === "manual"
                        ? "border-finsim-primary/40 dark:border-finsim-dark-primary/40 bg-white/90 dark:bg-white/5 shadow-lg shadow-finsim-primary/10 dark:shadow-finsim-dark-primary/10"
                        : "border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-white/60 dark:hover:border-white/15 hover:bg-white/85 dark:hover:bg-white/8"
                    }`}
                  >
                    {inputMode === "manual" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-br from-finsim-primary/5 via-transparent to-transparent pointer-events-none"
                      />
                    )}
                    <div className="relative flex items-start gap-4">
                      <motion.div 
                        className={`p-3 rounded-xl transition-all duration-200 ${
                          inputMode === "manual"
                            ? "bg-finsim-primary/10 dark:bg-finsim-dark-primary/20 text-finsim-primary dark:text-finsim-dark-primary"
                            : "bg-white/40 dark:bg-white/5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary group-hover:bg-finsim-primary/5 dark:group-hover:bg-finsim-dark-primary/10"
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <PenTool className="h-6 w-6" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-base font-semibold mb-1 transition-colors ${
                          inputMode === "manual"
                            ? "text-finsim-textMain dark:text-white"
                            : "text-finsim-textMain dark:text-white group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary"
                        }`}>
            Manuell eingeben
                        </h4>
                        <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                          Schnell einzelne Transaktionen hinzufügen
                        </p>
                      </div>
                    </div>
                    {inputMode === "manual" && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute top-3 right-3 w-5 h-5 bg-finsim-primary dark:bg-finsim-dark-primary rounded-full flex items-center justify-center shadow-sm"
                      >
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </motion.div>
                    )}
                  </motion.button>

                  {/* Quiz Data Card */}
                  {canUseQuizData && onUseQuizData && (
                    <motion.button
                      onClick={() => setInputMode("quiz")}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      className={`group relative rounded-2xl p-5 border transition-all duration-200 text-left overflow-hidden ${
                        inputMode === "quiz"
                          ? "border-finsim-primary/40 dark:border-finsim-dark-primary/40 bg-white/90 dark:bg-white/5 shadow-lg shadow-finsim-primary/10 dark:shadow-finsim-dark-primary/10"
                          : "border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-white/60 dark:hover:border-white/15 hover:bg-white/85 dark:hover:bg-white/8"
                      }`}
                    >
                      {inputMode === "quiz" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-gradient-to-br from-finsim-primary/5 via-transparent to-transparent pointer-events-none"
                        />
                      )}
                      <div className="relative flex items-start gap-4">
                        <motion.div 
                          className={`p-3 rounded-xl transition-all duration-200 ${
                            inputMode === "quiz"
                              ? "bg-finsim-primary/10 dark:bg-finsim-dark-primary/20 text-finsim-primary dark:text-finsim-dark-primary"
                              : "bg-white/40 dark:bg-white/5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary group-hover:bg-finsim-primary/5 dark:group-hover:bg-finsim-dark-primary/10"
                          }`}
                          whileHover={{ scale: 1.05 }}
                        >
                          <Brain className="h-6 w-6" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-base font-semibold mb-1 transition-colors ${
                            inputMode === "quiz"
                              ? "text-finsim-textMain dark:text-white"
                              : "text-finsim-textMain dark:text-white group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary"
                          }`}>
                            Quiz-Daten
                          </h4>
                          <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                            Nutze dein Profil für eine schnelle Simulation
                          </p>
                        </div>
                      </div>
                      {inputMode === "quiz" && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="absolute top-3 right-3 w-5 h-5 bg-finsim-primary dark:bg-finsim-dark-primary rounded-full flex items-center justify-center shadow-sm"
                        >
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  )}
                </div>

        {/* Info Tip - Dismissible */}
        <AnimatePresence>
          {showInfoTip && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative rounded-xl bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/30 p-4 pr-10 flex items-start gap-3"
            >
              <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  Für tiefergehende Analysen empfehlen wir echte CSV-Daten
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300/80 leading-relaxed">
                  CSV-Dateien mit vollständiger Transaktionshistorie liefern präzisere Prognosen, detailliertere Kategorienanalysen und realistischere Szenarien. Manuelle Eingabe eignet sich für schnelle Tests einzelner Transaktionen.
                </p>
              </div>
              <button
                onClick={() => setShowInfoTip(false)}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-blue-100/50 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
          </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {inputMode === "quiz" && canUseQuizData && onUseQuizData ? (
          <motion.div
            className="rounded-[28px] border border-white/40 dark:border-white/10 glass-effect p-8 bg-gradient-to-br from-finsim-primary/5 via-transparent to-finsim-accent/5 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-finsim-textMuted dark:text-finsim-dark-textMuted mb-1">
                  Schnellste Option
                </p>
                <h4 className="text-xl font-semibold text-finsim-textMain dark:text-white">Profil-Daten nutzen</h4>
                <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary mt-2">
                  Wir konvertieren dein Quiz-Profil automatisch in ein realistisches Datenset (12 Monate) – ideal,
                  wenn noch keine CSV vorliegt.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/60 dark:bg-white/10 px-4 py-2 text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                <Sparkles className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
                <span>Perfekt für erste Simulationen</span>
              </div>
            </div>
            <ul className="grid gap-3 text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Automatisch erzeugte Einnahmen & Ausgaben basierend auf deinem Einkommen, Fixkosten und Sparquote.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-finsim-primary mt-0.5" />
                <span>Ideal für KI-Empfehlungen, wenn noch keine CSV bereitsteht.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
                <span>Für tiefergehende Analysen empfehlen wir dennoch echte CSV-Daten.</span>
              </li>
            </ul>
            <motion.button
              onClick={onUseQuizData}
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent text-white px-6 py-4 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Wird gestartet...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Analyse mit Quiz-Daten starten
                </>
              )}
            </motion.button>
          </motion.div>
        ) : inputMode === "csv" ? (
            <motion.div
              className={`relative border-2 border-dashed rounded-[28px] p-12 sm:p-16 text-center transition-all duration-500 overflow-hidden ${
                dragActive
                  ? "border-finsim-primary dark:border-finsim-dark-primary bg-gradient-to-br from-finsim-primary/10 to-finsim-accent/10 dark:from-finsim-dark-primary/15 dark:to-finsim-dark-accent/15 shadow-2xl shadow-finsim-primary/20"
                  : "border-finsim-borderLight/50 dark:border-finsim-dark-borderLight/30 bg-gradient-to-br from-white/50 to-finsim-surfaceMuted/30 dark:from-finsim-dark-surfaceElevated/40 dark:to-finsim-dark-surfaceMuted/20"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              whileHover={{ scale: 1.01 }}
              animate={{
                borderColor: dragActive
                  ? "hsl(217, 91%, 60%)"
                  : "hsl(220, 13%, 91%)",
              }}
            >
              {/* Animated background effects */}
              {dragActive && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-finsim-primary/20 via-transparent to-finsim-accent/20"
                  animate={{ x: [-100, 100] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleChange}
                className="hidden"
                disabled={isLoading}
              />
              <div className="relative flex flex-col items-center space-y-6">
                <motion.div
                  className="relative mx-auto w-24 h-24 rounded-full border border-white/60 dark:border-white/15 bg-white/45 dark:bg-white/10 shadow-[0_25px_45px_rgba(15,23,42,0.2)] flex items-center justify-center"
                  animate={dragActive ? { scale: [1, 1.05, 1], rotate: [0, 4, -4, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 1.5, repeat: dragActive ? Infinity : 0, ease: "easeInOut" }}
                >
                  <motion.div
                    className={`rounded-full p-4 bg-white/90 dark:bg-white/15 ${
                      dragActive ? "text-finsim-primary dark:text-finsim-dark-primary" : "text-finsim-textSecondary/70 dark:text-finsim-dark-textSecondary/70"
                    }`}
                    animate={dragActive ? { y: [-3, 3, -3] } : { y: 0 }}
                    transition={{ duration: 1.6, repeat: dragActive ? Infinity : 0, ease: "easeInOut" }}
                  >
                    <ArrowUpCircle className="h-12 w-12" strokeWidth={1.5} />
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-finsim-primary/30 to-finsim-accent/30 dark:from-finsim-dark-primary/25 dark:to-finsim-dark-accent/25 blur-2xl"
                    animate={dragActive ? { scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] } : { opacity: 0.35 }}
                    transition={{ duration: 2, repeat: dragActive ? Infinity : 0, ease: "easeInOut" }}
                  />
                </motion.div>
                
                <div className="space-y-3">
                  <motion.p
                    className="text-lg font-bold text-finsim-textMain dark:text-finsim-dark-textMain"
                    animate={dragActive ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.5, repeat: dragActive ? Infinity : 0 }}
                  >
                    {dragActive ? "✨ Datei hier ablegen" : "Ziehe deine CSV-Datei hierher"}
                  </motion.p>
                  <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                    oder klicke zum Auswählen
                  </p>
                </div>
                
                <motion.button
                  onClick={onButtonClick}
                  disabled={isLoading}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent text-white px-10 py-4 text-base font-bold shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Wird verarbeitet...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Datei auswählen
                    </>
                  )}
                </motion.button>
                
                <motion.div
                  className="flex items-center gap-2 text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Format: date, amount, category, description</span>
                </motion.div>
              </div>
            </motion.div>
          ) : (
        <div className="space-y-6">
          {/* Progress Bar */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-finsim-textSecondary dark:text-finsim-dark-textSecondary font-medium">
                Fortschritt
              </span>
              <span className="text-finsim-primary dark:text-finsim-dark-primary font-semibold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 bg-finsim-surfaceMuted dark:bg-finsim-dark-surfaceMuted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* Success Animation */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Transaktion erfolgreich hinzugefügt! 🎉
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Fields */}
        <div className="space-y-4">
            {/* Date & Type Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="relative space-y-2"
              >
                <label className="block text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary mb-2 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Datum
                </label>
                {/* Quick Date Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "Heute", value: new Date().toISOString().split('T')[0], emoji: "📅" },
                    { label: "Gestern", value: new Date(Date.now() - 86400000).toISOString().split('T')[0], emoji: "⬅️" },
                    { label: "Vor 7 Tagen", value: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], emoji: "📆" },
                    { label: "Vor 30 Tagen", value: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], emoji: "🗓️" },
                  ].map((quickDate) => (
                    <motion.button
                      key={quickDate.value}
                      type="button"
                      onClick={() => setDate(quickDate.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                        date === quickDate.value
                          ? "bg-finsim-primary dark:bg-finsim-dark-primary text-white shadow-md"
                          : "bg-white/60 dark:bg-white/5 border border-finsim-borderLight dark:border-finsim-dark-borderLight text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:border-finsim-primary/50 dark:hover:border-finsim-dark-primary/50"
                      }`}
                    >
                      <span className="mr-1.5">{quickDate.emoji}</span>
                      {quickDate.label}
                    </motion.button>
                  ))}
                </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
                  onFocus={() => setFieldFocus("date")}
                  onBlur={() => setFieldFocus(null)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full rounded-2xl border-2 transition-all duration-300 bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain py-3.5 px-4 text-sm focus:outline-none cursor-pointer ${
                    fieldFocus === "date"
                      ? "border-finsim-primary dark:border-finsim-dark-primary shadow-lg shadow-finsim-primary/20 dark:shadow-finsim-dark-primary/20"
                      : date
                      ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10"
                      : "border-finsim-borderLight dark:border-finsim-dark-borderLight"
                  }`}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="relative"
              >
                <label className="block text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary mb-2 flex items-center gap-2">
                  {isExpense ? (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  Typ
                </label>
              <button
                type="button"
                onClick={() => setIsExpense((v) => !v)}
                  className={`w-full rounded-2xl border-2 px-4 py-3.5 text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  isExpense
                      ? "border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30 shadow-lg shadow-red-500/10"
                      : "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/10"
                }`}
              >
                  {isExpense ? (
                    <>
                      <TrendingDown className="h-4 w-4" />
                      Ausgabe
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      Einnahme
                    </>
                  )}
              </button>
              </motion.div>
            </div>

            {/* Amount */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <label className="block text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary mb-2 flex items-center gap-2">
                <Euro className="h-3.5 w-3.5" />
                Betrag
              </label>
              <div className="relative">
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                  onFocus={() => setFieldFocus("amount")}
                  onBlur={() => setFieldFocus(null)}
                  placeholder="0.00"
                  className={`w-full rounded-2xl border-2 transition-all duration-300 bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain py-3.5 px-4 pl-12 text-lg font-semibold focus:outline-none ${
                    fieldFocus === "amount"
                      ? "border-finsim-primary dark:border-finsim-dark-primary shadow-lg shadow-finsim-primary/20 dark:shadow-finsim-dark-primary/20"
                      : amount
                      ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10"
                      : "border-finsim-borderLight dark:border-finsim-dark-borderLight"
                  }`}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-finsim-textMuted dark:text-finsim-dark-textMuted">
                  €
                </div>
              </div>
            </motion.div>

            {/* Category Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-3"
            >
              <label className="block text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                Kategorie
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                {popularCategories.map((cat) => (
                  <motion.button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative rounded-xl border-2 p-3 text-center transition-all duration-300 shadow-lg ${
                      category === cat.name
                        ? cat.selectedClass
                        : "border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface hover:border-finsim-primary/50 dark:hover:border-finsim-dark-primary/50 text-finsim-textMuted dark:text-finsim-dark-textMuted"
                    }`}
                  >
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <div className={`text-[10px] font-medium truncate ${
                      category === cat.name
                        ? ""
                        : "text-finsim-textMuted dark:text-finsim-dark-textMuted"
                    }`}>
                      {cat.name}
                    </div>
                    {category === cat.name && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                      >
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
                onFocus={() => setFieldFocus("category")}
                onBlur={() => setFieldFocus(null)}
                placeholder="Oder eigene Kategorie eingeben..."
                className={`w-full rounded-2xl border-2 transition-all duration-300 bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain py-3 px-4 text-sm focus:outline-none ${
                  fieldFocus === "category"
                    ? "border-finsim-primary dark:border-finsim-dark-primary shadow-lg shadow-finsim-primary/20 dark:shadow-finsim-dark-primary/20"
                    : category && !popularCategories.find(c => c.name === category)
                    ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10"
                    : "border-finsim-borderLight dark:border-finsim-dark-borderLight"
                }`}
              />
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <label className="block text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary mb-2 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Beschreibung (optional)
              </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setFieldFocus("description")}
                onBlur={() => setFieldFocus(null)}
                placeholder="z.B. Supermarkt Einkauf"
                className={`w-full rounded-2xl border-2 transition-all duration-300 bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain py-3.5 px-4 text-sm focus:outline-none ${
                  fieldFocus === "description"
                    ? "border-finsim-primary dark:border-finsim-dark-primary shadow-lg shadow-finsim-primary/20 dark:shadow-finsim-dark-primary/20"
                    : description
                    ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10"
                    : "border-finsim-borderLight dark:border-finsim-dark-borderLight"
                }`}
            />
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2 relative z-10">
            <motion.button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const isValid = isFormValid()
                console.log("Button clicked", { isValid, isLoading, date, amount, category })
                if (!isLoading && isValid) {
                  addManualTransaction(e)
                }
              }}
              whileHover={isFormValid() && !isLoading ? { scale: 1.02 } : {}}
              whileTap={isFormValid() && !isLoading ? { scale: 0.98 } : {}}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl text-white px-6 py-4 text-base font-semibold shadow-lg transition-all duration-300 relative z-10 ${
                isFormValid() && !isLoading
                  ? "bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent hover:shadow-xl cursor-pointer"
                  : "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              <Plus className="h-5 w-5" />
              Transaktion hinzufügen
            </motion.button>
            <motion.button
              onClick={startAnalysisWithManual}
              disabled={isLoading || manualTransactions.length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-finsim-primary dark:bg-finsim-dark-primary text-white px-6 py-4 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Zap className="h-5 w-5" />
              Analyse starten
            </motion.button>
          </div>

          {/* Transactions List */}
          <AnimatePresence>
            {manualTransactions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 px-4 rounded-2xl bg-finsim-surfaceMuted/50 dark:bg-finsim-dark-surfaceMuted/30 border-2 border-dashed border-finsim-borderLight dark:border-finsim-dark-borderLight"
              >
                <Sparkles className="h-12 w-12 mx-auto text-finsim-textMuted dark:text-finsim-dark-textMuted mb-3" />
                <p className="text-sm font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                  Füge deine erste Transaktion hinzu
                </p>
                <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted mt-1">
                  Fülle die Felder oben aus und klicke auf &quot;Transaktion hinzufügen&quot;
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
                    {manualTransactions.length} Transaktion{manualTransactions.length !== 1 ? "en" : ""}
                  </h4>
                  <span className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                    Bereit für Analyse
                  </span>
              </div>
                <div className="space-y-2">
                {manualTransactions.map((t, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      layout
                      className="group relative rounded-2xl border-2 border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface p-4 hover:border-finsim-primary/50 dark:hover:border-finsim-dark-primary/50 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                            t.amount < 0
                              ? "bg-red-50 dark:bg-red-500/20"
                              : "bg-emerald-50 dark:bg-emerald-500/20"
                          }`}>
                            {t.amount < 0 ? "📉" : "📈"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain truncate">
                                {t.category}
                              </span>
                              <span className={`text-sm font-bold ${
                                t.amount < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {t.amount > 0 ? "+" : ""}{t.amount.toFixed(2)} €
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                              <span>{t.date}</span>
                              {t.description && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{t.description}</span>
                                </>
                              )}
                            </div>
                          </div>
                    </div>
                    <button
                      onClick={() => removeManualTransaction(idx)}
                          className="ml-3 p-2 rounded-lg text-finsim-textMuted dark:text-finsim-dark-textMuted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                    </motion.div>
                ))}
              </div>
              </motion.div>
          )}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  )
}

