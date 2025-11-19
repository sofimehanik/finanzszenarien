"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { getAnalysisHistory, getAnalysisById, deleteAnalysis, updateAnalysis, AnalysisResponse } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { X, Trash2, FileText, Calendar, Search, Edit2, Check, Sparkles, TrendingUp, Award, Clock, Filter } from "lucide-react"

interface AnalysisHistoryItem {
  id: number
  title: string
  user_goal?: string
  created_at: string
  updated_at?: string
}

interface AnalysisHistorySidebarProps {
  open: boolean
  onClose: () => void
  onSelectAnalysis: (analysis: AnalysisResponse) => void
}

export function AnalysisHistorySidebar({ open, onClose, onSelectAnalysis }: AnalysisHistorySidebarProps) {
  const { isAuthenticated } = useAuth()
  const [histories, setHistories] = useState<AnalysisHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [filter, setFilter] = useState<"all" | "recent" | "oldest">("all")

  useEffect(() => {
    if (open && isAuthenticated) {
      loadHistory()
    }
  }, [open, isAuthenticated])

  const loadHistory = async () => {
    setIsLoading(true)
    setError("")
    try {
      const data = await getAnalysisHistory()
      setHistories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Geschichte")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (id: number) => {
    if (editingId === id) return // Don't select if editing
    try {
      const analysis = await getAnalysisById(id)
      onSelectAnalysis(analysis)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Analyse")
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Möchtest du diese Analyse wirklich löschen?")) {
      return
    }
    try {
      await deleteAnalysis(id)
      setHistories(histories.filter(h => h.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen")
    }
  }

  const handleStartEdit = (id: number, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(id)
    setEditingTitle(currentTitle)
  }

  const handleSaveEdit = async (id: number) => {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    try {
      const updated = await updateAnalysis(id, editingTitle.trim())
      setHistories(histories.map(h => h.id === id ? updated : h))
      setEditingId(null)
      setEditingTitle("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Aktualisieren")
      setEditingId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTitle("")
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return "gerade eben"
      if (diffMins < 60) return `vor ${diffMins} Min.`
      if (diffHours < 24) return `vor ${diffHours} Std.`
      if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`
      
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  // Filter and search
  const filteredHistories = useMemo(() => {
    let filtered = [...histories]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(h => 
        h.title.toLowerCase().includes(query) || 
        (h.user_goal && h.user_goal.toLowerCase().includes(query))
      )
    }

    // Sort filter
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      if (filter === "recent") return dateB - dateA
      if (filter === "oldest") return dateA - dateB
      return dateB - dateA // Default: recent first
    })

    return filtered
  }, [histories, searchQuery, filter])

  // Gamification: Calculate stats
  const stats = useMemo(() => {
    const total = histories.length
    const thisWeek = histories.filter(h => {
      const date = new Date(h.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return date >= weekAgo
    }).length
    return { total, thisWeek }
  }, [histories])

  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* Backdrop - OpenAI style smooth fade */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* Sidebar - OpenAI style smooth slide */}
          <motion.div
            initial={{ x: -420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 300,
              mass: 0.8,
              opacity: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
            }}
            className={`
              fixed top-0 left-0 h-full w-96 max-w-[90vw] bg-white/85 dark:bg-[#0b0f1c]/95 backdrop-blur-2xl border-r border-white/40 dark:border-white/10 z-50
              flex flex-col shadow-2xl
            `}
          >
            {/* Header with Stats - Smooth fade in */}
            <motion.div 
              className="relative p-6 border-b border-white/20 dark:border-white/10 bg-gradient-to-br from-finsim-primary/5 via-transparent to-finsim-accent/5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.div 
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                >
                  <motion.div
                    className="p-2.5 rounded-xl bg-gradient-to-br from-finsim-primary/20 to-finsim-accent/20 dark:from-finsim-dark-primary/30 dark:to-finsim-dark-accent/30"
                    whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    <FileText className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-finsim-textMain dark:text-white tracking-tight">Analyse-Verlauf</h2>
                    <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted mt-0.5">Deine Finanzanalysen</p>
                  </div>
                </motion.div>
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                >
                  <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
                </motion.button>
              </div>

              {/* Stats Cards - Staggered animation */}
              <motion.div 
                className="grid grid-cols-2 gap-3"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.08,
                      delayChildren: 0.1
                    }
                  }
                }}
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 8, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="rounded-xl glass-effect border border-white/40 dark:border-white/10 p-3 bg-gradient-to-br from-white/60 to-white/40 dark:from-white/5 dark:to-transparent"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-finsim-primary dark:text-finsim-dark-primary" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-finsim-textMuted dark:text-finsim-dark-textMuted font-semibold">Gesamt</span>
                  </div>
                  <p className="text-2xl font-bold text-finsim-textMain dark:text-white">{stats.total}</p>
                </motion.div>
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 8, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="rounded-xl glass-effect border border-white/40 dark:border-white/10 p-3 bg-gradient-to-br from-white/60 to-white/40 dark:from-white/5 dark:to-transparent"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-finsim-accent dark:text-finsim-dark-accent" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-finsim-textMuted dark:text-finsim-dark-textMuted font-semibold">Diese Woche</span>
                  </div>
                  <p className="text-2xl font-bold text-finsim-textMain dark:text-white">{stats.thisWeek}</p>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Search & Filter - Smooth fade in */}
            <motion.div 
              className="p-4 space-y-3 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-finsim-textMuted dark:text-finsim-dark-textMuted" />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 text-sm text-finsim-textMain dark:text-white placeholder:text-finsim-textMuted dark:placeholder:text-finsim-dark-textMuted focus:outline-none focus:ring-2 focus:ring-finsim-primary/30 dark:focus:ring-finsim-dark-primary/30 transition-all"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-finsim-textMuted dark:text-finsim-dark-textMuted" />
                <div className="flex gap-1.5 flex-1">
                  {(["all", "recent", "oldest"] as const).map((f) => (
                    <motion.button
                      key={f}
                      onClick={() => setFilter(f)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filter === f
                          ? "bg-finsim-primary dark:bg-finsim-dark-primary text-white"
                          : "bg-white/60 dark:bg-white/5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:bg-white/80 dark:hover:bg-white/10"
                      }`}
                    >
                      {f === "all" ? "Alle" : f === "recent" ? "Neueste" : "Älteste"}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-3 border-finsim-primary/30 border-t-finsim-primary rounded-full mx-auto mb-3"
                  />
                  <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">Lädt...</p>
                </div>
              ) : error ? (
                <div className="p-4 m-4 rounded-xl bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">{error}</div>
              ) : filteredHistories.length === 0 ? (
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-finsim-primary/20 to-finsim-accent/20 dark:from-finsim-dark-primary/30 dark:to-finsim-dark-accent/30 flex items-center justify-center"
                  >
                    <FileText className="h-8 w-8 text-finsim-primary dark:text-finsim-dark-primary opacity-50" />
                  </motion.div>
                  <p className="text-sm font-medium text-finsim-textMain dark:text-white mb-1">
                    {searchQuery ? "Keine Ergebnisse" : "Noch keine Analysen"}
                  </p>
                  <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                    {searchQuery ? "Versuche andere Suchbegriffe" : "Starte deine erste Analyse"}
                  </p>
                </div>
              ) : (
                <motion.div 
                  className="p-4 space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                >
                  <AnimatePresence mode="popLayout">
                    {filteredHistories.map((history, index) => (
                      <motion.div
                        key={history.id}
                        initial={{ opacity: 0, x: -15, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 15, scale: 0.96 }}
                        transition={{ 
                          type: "spring",
                          damping: 25,
                          stiffness: 300,
                          delay: index * 0.03,
                          opacity: { duration: 0.15 }
                        }}
                        whileHover={{ scale: 1.01, x: 2 }}
                        onClick={() => handleSelect(history.id)}
                        className="group relative rounded-xl glass-effect border border-white/40 dark:border-white/10 p-4 cursor-pointer transition-all duration-200 hover:border-finsim-primary/30 dark:hover:border-finsim-dark-primary/30 hover:shadow-lg hover:shadow-finsim-primary/10 dark:hover:shadow-finsim-dark-primary/10 bg-gradient-to-br from-white/60 to-white/40 dark:from-white/5 dark:to-transparent"
                      >
                        {/* Gradient accent on hover */}
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-gradient-to-br from-finsim-primary/5 to-finsim-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        />

                        <div className="relative flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {editingId === history.id ? (
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(history.id)
                                    if (e.key === 'Escape') handleCancelEdit()
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 px-2 py-1 rounded-lg bg-white/80 dark:bg-white/10 border border-finsim-primary/30 dark:border-finsim-dark-primary/30 text-sm font-medium text-finsim-textMain dark:text-white focus:outline-none focus:ring-2 focus:ring-finsim-primary/30"
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSaveEdit(history.id)
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelEdit()
                                  }}
                                  className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <h3 className="text-sm font-semibold text-finsim-textMain dark:text-white truncate mb-1 group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary transition-colors">
                                {history.title}
                              </h3>
                            )}
                            {history.user_goal && (
                              <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary line-clamp-2 mb-2">
                                {history.user_goal}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(history.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleStartEdit(history.id, history.title, e)}
                              className="p-1.5 rounded-lg hover:bg-finsim-primary/10 dark:hover:bg-finsim-dark-primary/10 text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-finsim-primary dark:hover:text-finsim-dark-primary transition-all"
                              title="Umbenennen"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(history.id, e)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/20 text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-red-600 dark:hover:text-red-400 transition-all"
                              title="Löschen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
